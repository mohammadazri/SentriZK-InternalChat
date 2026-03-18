import 'package:isar/isar.dart';

part 'signal_state.g.dart';

@collection
class SignalSession {
  Id id = Isar.autoIncrement;

  @Index(unique: true, replace: true)
  late String addressName;

  late int deviceId;

  late List<int> serializedSession;
}

@collection
class SignalPreKey {
  Id id = 0; // Maps directly to preKeyId

  late List<int> serializedKey;
}

@collection
class SignalSignedPreKey {
  Id id = 0; // Maps directly to signedPreKeyId

  late List<int> serializedKey;
}

@collection
class SignalIdentity {
  Id id = Isar.autoIncrement;

  @Index(unique: true, replace: true)
  late String addressName;

  late List<int> identityKey; // The public identity key of a remote contact
}

@collection
class LocalSignalIdentity {
  Id id = 0; // Local singleton 
  
  late List<int> identityKeyPair; // Our own serialized IdentityKeyPair
  late int registrationId; // Our local registration ID
}
