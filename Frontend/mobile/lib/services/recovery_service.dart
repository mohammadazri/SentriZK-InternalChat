import 'dart:convert';
import 'dart:typed_data';
import 'dart:math';

import 'package:bip39/bip39.dart' as bip39;
import 'package:cryptography/cryptography.dart';

class RecoveryService {
  static const String _hkdfInfoMnemonic = 'app:mnemonic:v1';

  static Uint8List _utf8(String s) => Uint8List.fromList(utf8.encode(s));
  static String _toHex(Uint8List bytes) =>
      bytes.map((b) => b.toRadixString(16).padLeft(2, '0')).join();
  static Uint8List _concat(List<Uint8List> parts) {
    final total = parts.fold<int>(0, (p, e) => p + e.length);
    final out = Uint8List(total);
    int o = 0;
    for (final p in parts) {
      out.setRange(o, o + p.length, p);
      o += p.length;
    }
    return out;
  }

  static Uint8List _randomBytes(int length) {
    final r = Random.secure();
    final out = Uint8List(length);
    for (var i = 0; i < length; i++) {
      out[i] = r.nextInt(256);
    }
    return out;
  }

  // Derive salt (16 bytes) from mnemonic using HKDF-SHA256 with empty salt and info "app:mnemonic:v1".
  static Future<String> deriveSaltFromMnemonic(
    String mnemonic, {
    String passphrase = '',
  }) async {
    // Normalize the mnemonic: trim and collapse multiple spaces
    final normalized = mnemonic.trim().toLowerCase().replaceAll(
      RegExp(r'\s+'),
      ' ',
    );

    if (!bip39.validateMnemonic(normalized)) {
      throw ArgumentError(
        'Invalid mnemonic phrase. Please check your 12 or 24 words.',
      );
    }

    // bip39.mnemonicToSeed returns Uint8List synchronously
    final seed = bip39.mnemonicToSeed(normalized, passphrase: passphrase);

    // Ensure seed is non-empty (should be 64 bytes)
    if (seed.isEmpty) {
      throw ArgumentError('Generated seed is empty');
    }

    // Use HKDF to derive 16 bytes (128 bits) salt matching web's implementation
    final hkdf = Hkdf(hmac: Hmac.sha256(), outputLength: 16);
    final derivedKey = await hkdf.deriveKey(
      secretKey: SecretKey(List<int>.from(seed)),
      info: _utf8(_hkdfInfoMnemonic),
      nonce: [],
    );

    final okm = await derivedKey.extractBytes();
    return _toHex(Uint8List.fromList(okm)).toLowerCase();
  }

  // Encrypt saltHex using PBKDF2(SHA-256, 100000) -> AES-GCM(256) with 12-byte IV.
  // Output compatible with web's encryptSaltHex: base64(JSON{kdfSalt,iv,ct,version}).
  static Future<String> encryptSaltHex(String saltHex, String password) async {
    if (saltHex.isEmpty || password.isEmpty) {
      throw ArgumentError('saltHex and password required');
    }
    final kdfSalt = _randomBytes(16);
    final iv = _randomBytes(12);

    final pbkdf2 = Pbkdf2(
      macAlgorithm: Hmac.sha256(),
      iterations: 100000,
      bits: 256,
    );
    final baseKey = await pbkdf2.deriveKey(
      secretKey: SecretKey(_utf8(password)),
      nonce: kdfSalt,
    );

    final algo = AesGcm.with256bits();
    final secretBox = await algo.encrypt(
      _utf8(saltHex),
      secretKey: baseKey,
      nonce: iv,
    );

    // WebCrypto AES-GCM ct = cipherText || tag
    final ctAndTag = _concat([
      Uint8List.fromList(secretBox.cipherText),
      Uint8List.fromList(secretBox.mac.bytes),
    ]);

    String b64(Uint8List b) => base64Encode(b);

    final bundle = {
      'kdfSalt': b64(kdfSalt),
      'iv': b64(iv),
      'ct': b64(ctAndTag),
      'version': 1,
    };

    final jsonStr = jsonEncode(bundle);
    return base64Encode(utf8.encode(jsonStr));
  }
}
