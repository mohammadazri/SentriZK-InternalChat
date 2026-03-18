import 'dart:convert';
import 'dart:typed_data';
import 'dart:math';
import 'package:libsignal_protocol_dart/libsignal_protocol_dart.dart';
import '../../models/signal_state.dart';
import '../message_security_service.dart';
import 'signal_store_impl.dart';

/// Orchestrates Double Ratchet E2EE using libsignal_protocol_dart
class SignalManager {
  static SignalManager? _instance;
  late IsarSignalStore _store;
  bool _initialized = false;

  SignalManager._();

  static SignalManager get instance {
    _instance ??= SignalManager._();
    return _instance!;
  }

  Future<void> init(int localRegistrationId) async {
    if (_initialized) return;
    
    // Uses the shared Isar instance that now contains Signal schemas
    final isar = await MessageSecurityService.getInstance();
    _store = IsarSignalStore(isar);

    // Generate local identity if missing
    final local = await isar.localSignalIdentitys.get(0);
    if (local == null) {
      print('🔐 [E2EE] No local identity found. Generating new keys...');
      
      final identityKeyPair = generateIdentityKeyPair();
      final registrationId = generateRandomRegistrationId();

      await isar.writeTxn(() async {
        await isar.localSignalIdentitys.put(
          LocalSignalIdentity()
            ..id = 0
            ..identityKeyPair = identityKeyPair.serialize().toList()
            ..registrationId = registrationId,
        );
      });
      print('🔐 [E2EE] Local identity generated successfully.');
    } else {
      // Identity exists, but check if PreKeys exist (fixes Isar autoIncrement bug recovery)
      final preKeyCount = await isar.signalPreKeys.count();
      if (preKeyCount == 0) {
        print('🔐 [E2EE] Local identity exists but PreKeys are missing. Rebuilding PreKeys...');
        // We defer this so it doesn't block init entirely, but it ensures they get created
        Future.microtask(() => generatePreKeyBundle());
      }
    }

    _initialized = true;
  }

  /// Retrieves the public identity key for this specific device
  Future<String> getLocalIdentityKeyBase64() async {
    await _initCheck();
    final identityKeyPair = await _store.getIdentityKeyPair();
    return base64Encode(identityKeyPair.getPublicKey().serialize());
  }

  /// Generates the initial PreKey bundle for X3DH to upload to Firestore
  Future<Map<String, dynamic>> generatePreKeyBundle() async {
    await _initCheck();
    
    final identityKeyPair = await _store.getIdentityKeyPair();
    final registrationId = await _store.getLocalRegistrationId();

    final preKeys = generatePreKeys(0, 100);
    for (var preKey in preKeys) {
      await _store.storePreKey(preKey.id, preKey);
    }

    final signedPreKey = generateSignedPreKey(identityKeyPair, 0);
    await _store.storeSignedPreKey(signedPreKey.id, signedPreKey);

    return {
      'registrationId': registrationId,
      'deviceId': 1, // Standard for mobile single-device
      'identityKey': base64Encode(identityKeyPair.getPublicKey().serialize()),
      'signedPreKey': {
        'id': signedPreKey.id,
        'publicKey': base64Encode(signedPreKey.getKeyPair().publicKey.serialize()),
        'signature': base64Encode(signedPreKey.signature)
      },
      'preKeys': preKeys.map((k) => {
        'id': k.id,
        'publicKey': base64Encode(k.getKeyPair().publicKey.serialize())
      }).toList(),
    };
  }

  /// Establishes the initial trusted session with a remote user using their PreKey bundle
  Future<void> establishSession(String remoteUserId, Map<String, dynamic> remoteBundle) async {
    await _initCheck();
    
    final address = SignalProtocolAddress(remoteUserId, 1);
    
    if (await _store.containsSession(address)) {
      return; // Found existing session, no need to establish
    }

    final identityKey = IdentityKey.fromBytes(Uint8List.fromList(base64Decode(remoteBundle['identityKey'])), 0);
    
    final signedPreKeyMap = remoteBundle['signedPreKey'];
    final signedPreKeyId = signedPreKeyMap['id'] as int;
    final signedPreKeyPublic = Curve.decodePoint(Uint8List.fromList(base64Decode(signedPreKeyMap['publicKey'])), 0);
    final signedPreKeySignature = Uint8List.fromList(base64Decode(signedPreKeyMap['signature']));

    final preKeyList = remoteBundle['preKeys'] as List; 
    // Use the first preKey available
    if (preKeyList.isEmpty) throw Exception('No one-time pre-keys available for $remoteUserId');
    final preKeyMap = preKeyList[0];
    final preKeyId = preKeyMap['id'] as int;
    final preKeyPublic = Curve.decodePoint(Uint8List.fromList(base64Decode(preKeyMap['publicKey'])), 0);

    final bundle = PreKeyBundle(
      remoteBundle['registrationId'] as int,
      1, 
      preKeyId,
      preKeyPublic,
      signedPreKeyId,
      signedPreKeyPublic,
      signedPreKeySignature,
      identityKey,
    );

    final builder = SessionBuilder(_store, _store, _store, _store, address);
    await builder.processPreKeyBundle(bundle);
  }

  /// Encrypts an outgoing message using the current derived Ratchet key
  Future<Map<String, dynamic>> encryptMessage(String remoteUserId, String plaintext) async {
    await _initCheck();
    
    final address = SignalProtocolAddress(remoteUserId, 1);
    final cipher = SessionCipher(_store, _store, _store, _store, address);
    
    final ciphertextMessage = await cipher.encrypt(Uint8List.fromList(utf8.encode(plaintext)));
    
    return {
      'type': ciphertextMessage.getType(),
      'ciphertext': base64Encode(ciphertextMessage.serialize())
    };
  }

  /// Decrypts an incoming message and advances the local Double Ratchet state
  Future<String> decryptMessage(String remoteUserId, int type, String base64Ciphertext) async {
    await _initCheck();
    
    final address = SignalProtocolAddress(remoteUserId, 1);
    final cipher = SessionCipher(_store, _store, _store, _store, address);
    final ciphertextBytes = Uint8List.fromList(base64Decode(base64Ciphertext));

    Uint8List plaintextBytes;
    if (type == CiphertextMessage.prekeyType) {
      final preKeyMessage = PreKeySignalMessage(ciphertextBytes);
      plaintextBytes = await cipher.decrypt(preKeyMessage);
    } else if (type == CiphertextMessage.whisperType) {
      final whisperMessage = SignalMessage.fromSerialized(ciphertextBytes);
      plaintextBytes = await cipher.decryptFromSignal(whisperMessage);
    } else {
      throw Exception('Unknown message type $type');
    }

    return utf8.decode(plaintextBytes);
  }

  /// Generate a unique device 14-bit registration Id
  static int generateRandomRegistrationId() {
    return Random.secure().nextInt(16380) + 1;
  }

  Future<void> _initCheck() async {
    if (!_initialized) throw Exception('SignalManager not initialized!');
  }
}
