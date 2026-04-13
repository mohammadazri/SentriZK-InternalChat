import 'dart:typed_data';
import 'package:isar/isar.dart';
import 'package:libsignal_protocol_dart/libsignal_protocol_dart.dart';
import '../../models/signal_state.dart';

class IsarSignalStore implements SignalProtocolStore {
  final Isar isar;

  IsarSignalStore(this.isar);

  // --- IdentityKeyStore ---

  @override
  Future<IdentityKeyPair> getIdentityKeyPair() async {
    final local = await isar.localSignalIdentitys.get(0);
    if (local == null) {
      throw Exception('Local identity key pair not found');
    }
    return IdentityKeyPair.fromSerialized(Uint8List.fromList(local.identityKeyPair));
  }

  @override
  Future<int> getLocalRegistrationId() async {
    final local = await isar.localSignalIdentitys.get(0);
    if (local == null) {
      throw Exception('Local registration ID not found');
    }
    return local.registrationId;
  }

  @override
  Future<bool> saveIdentity(SignalProtocolAddress address, IdentityKey? identityKey) async {
    if (identityKey == null) return false;
    final addressName = '${address.getName()}:${address.getDeviceId()}';
    
    final existing = await isar.signalIdentitys.filter().addressNameEqualTo(addressName).findFirst();
    
    final entity = SignalIdentity()
      ..id = existing?.id ?? Isar.autoIncrement
      ..addressName = addressName
      ..identityKey = identityKey.serialize().toList();

    await isar.writeTxn(() async {
      await isar.signalIdentitys.put(entity);
    });
    return true;
  }

  @override
  Future<bool> isTrustedIdentity(SignalProtocolAddress address, IdentityKey? identityKey, Direction direction) async {
    if (identityKey == null) return false;
    final addressName = '${address.getName()}:${address.getDeviceId()}';
    final existing = await isar.signalIdentitys.filter().addressNameEqualTo(addressName).findFirst();
    if (existing == null) return true; // Trust on first use (TOFU)
    
    final existingKey = IdentityKey.fromBytes(Uint8List.fromList(existing.identityKey), 0);
    
    // Auto-heal identity changes seamlessly to prevent 'Decryption Failed' UX drops
    if (existingKey != identityKey) {
      print('🔓 [E2EE] Remote identity changed for ${address.getName()}. Auto-healing and trusting new identity...');
      await saveIdentity(address, identityKey);
      return true;
    }
    
    return true;
  }

  @override
  Future<IdentityKey?> getIdentity(SignalProtocolAddress address) async {
    final addressName = '${address.getName()}:${address.getDeviceId()}';
    final existing = await isar.signalIdentitys.filter().addressNameEqualTo(addressName).findFirst();
    if (existing == null) return null;
    return IdentityKey.fromBytes(Uint8List.fromList(existing.identityKey), 0);
  }

  Future<void> deleteIdentity(SignalProtocolAddress address) async {
    final addressName = '${address.getName()}:${address.getDeviceId()}';
    await isar.writeTxn(() async {
      await isar.signalIdentitys.filter().addressNameEqualTo(addressName).deleteAll();
    });
  }

  // --- PreKeyStore ---

  @override
  Future<PreKeyRecord> loadPreKey(int preKeyId) async {
    final record = await isar.signalPreKeys.get(preKeyId);
    if (record == null) throw InvalidKeyIdException('No such prekeyRecord $preKeyId!');
    return PreKeyRecord.fromBuffer(Uint8List.fromList(record.serializedKey));
  }

  @override
  Future<void> storePreKey(int preKeyId, PreKeyRecord record) async {
    final entity = SignalPreKey()
      ..id = preKeyId
      ..serializedKey = record.serialize().toList();
    await isar.writeTxn(() async {
      await isar.signalPreKeys.put(entity);
    });
  }

  @override
  Future<bool> containsPreKey(int preKeyId) async {
    return (await isar.signalPreKeys.get(preKeyId)) != null;
  }

  @override
  Future<void> removePreKey(int preKeyId) async {
    await isar.writeTxn(() async {
      await isar.signalPreKeys.delete(preKeyId);
    });
  }

  // --- SignedPreKeyStore ---

  @override
  Future<SignedPreKeyRecord> loadSignedPreKey(int signedPreKeyId) async {
    final record = await isar.signalSignedPreKeys.get(signedPreKeyId);
    if (record == null) throw InvalidKeyIdException('No such signedprekeyRecord $signedPreKeyId!');
    return SignedPreKeyRecord.fromSerialized(Uint8List.fromList(record.serializedKey));
  }

  @override
  Future<List<SignedPreKeyRecord>> loadSignedPreKeys() async {
    final records = await isar.signalSignedPreKeys.where().findAll();
    return records.map((r) => SignedPreKeyRecord.fromSerialized(Uint8List.fromList(r.serializedKey))).toList();
  }

  @override
  Future<void> storeSignedPreKey(int signedPreKeyId, SignedPreKeyRecord record) async {
    final entity = SignalSignedPreKey()
      ..id = signedPreKeyId
      ..serializedKey = record.serialize().toList();
    await isar.writeTxn(() async {
      await isar.signalSignedPreKeys.put(entity);
    });
  }

  @override
  Future<bool> containsSignedPreKey(int signedPreKeyId) async {
    return (await isar.signalSignedPreKeys.get(signedPreKeyId)) != null;
  }

  @override
  Future<void> removeSignedPreKey(int signedPreKeyId) async {
    await isar.writeTxn(() async {
      await isar.signalSignedPreKeys.delete(signedPreKeyId);
    });
  }

  // --- SessionStore ---

  @override
  Future<SessionRecord> loadSession(SignalProtocolAddress address) async {
    final addressName = '${address.getName()}:${address.getDeviceId()}';
    final existing = await isar.signalSessions.filter().addressNameEqualTo(addressName).findFirst();
    if (existing == null) return SessionRecord();
    return SessionRecord.fromSerialized(Uint8List.fromList(existing.serializedSession));
  }

  @override
  Future<List<int>> getSubDeviceSessions(String name) async {
    final sessions = await isar.signalSessions.filter().addressNameStartsWith('$name:').findAll();
    return sessions.map((s) => s.deviceId).toList();
  }

  @override
  Future<void> storeSession(SignalProtocolAddress address, SessionRecord record) async {
    final addressName = '${address.getName()}:${address.getDeviceId()}';
    final existing = await isar.signalSessions.filter().addressNameEqualTo(addressName).findFirst();
    
    final entity = SignalSession()
      ..id = existing?.id ?? Isar.autoIncrement
      ..addressName = addressName
      ..deviceId = address.getDeviceId()
      ..serializedSession = record.serialize().toList();

    await isar.writeTxn(() async {
      await isar.signalSessions.put(entity);
    });
  }

  @override
  Future<bool> containsSession(SignalProtocolAddress address) async {
    final addressName = '${address.getName()}:${address.getDeviceId()}';
    return (await isar.signalSessions.filter().addressNameEqualTo(addressName).findFirst()) != null;
  }

  @override
  Future<void> deleteSession(SignalProtocolAddress address) async {
    final addressName = '${address.getName()}:${address.getDeviceId()}';
    await isar.writeTxn(() async {
      await isar.signalSessions.filter().addressNameEqualTo(addressName).deleteAll();
    });
  }

  @override
  Future<void> deleteAllSessions(String name) async {
    await isar.writeTxn(() async {
      await isar.signalSessions.filter().addressNameStartsWith('$name:').deleteAll();
    });
  }
}
