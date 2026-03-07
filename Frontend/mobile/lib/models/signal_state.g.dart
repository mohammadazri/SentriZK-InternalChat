// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'signal_state.dart';

// **************************************************************************
// IsarCollectionGenerator
// **************************************************************************

// coverage:ignore-file
// ignore_for_file: duplicate_ignore, non_constant_identifier_names, constant_identifier_names, invalid_use_of_protected_member, unnecessary_cast, prefer_const_constructors, lines_longer_than_80_chars, require_trailing_commas, inference_failure_on_function_invocation, unnecessary_parenthesis, unnecessary_raw_strings, unnecessary_null_checks, join_return_with_assignment, prefer_final_locals, avoid_js_rounded_ints, avoid_positional_boolean_parameters, always_specify_types

extension GetSignalSessionCollection on Isar {
  IsarCollection<SignalSession> get signalSessions => this.collection();
}

const SignalSessionSchema = CollectionSchema(
  name: r'SignalSession',
  id: -5646230494878627095,
  properties: {
    r'addressName': PropertySchema(
      id: 0,
      name: r'addressName',
      type: IsarType.string,
    ),
    r'deviceId': PropertySchema(
      id: 1,
      name: r'deviceId',
      type: IsarType.long,
    ),
    r'serializedSession': PropertySchema(
      id: 2,
      name: r'serializedSession',
      type: IsarType.longList,
    )
  },
  estimateSize: _signalSessionEstimateSize,
  serialize: _signalSessionSerialize,
  deserialize: _signalSessionDeserialize,
  deserializeProp: _signalSessionDeserializeProp,
  idName: r'id',
  indexes: {
    r'addressName': IndexSchema(
      id: 9175263881703466986,
      name: r'addressName',
      unique: true,
      replace: true,
      properties: [
        IndexPropertySchema(
          name: r'addressName',
          type: IndexType.hash,
          caseSensitive: true,
        )
      ],
    )
  },
  links: {},
  embeddedSchemas: {},
  getId: _signalSessionGetId,
  getLinks: _signalSessionGetLinks,
  attach: _signalSessionAttach,
  version: '3.1.0+1',
);

int _signalSessionEstimateSize(
  SignalSession object,
  List<int> offsets,
  Map<Type, List<int>> allOffsets,
) {
  var bytesCount = offsets.last;
  bytesCount += 3 + object.addressName.length * 3;
  bytesCount += 3 + object.serializedSession.length * 8;
  return bytesCount;
}

void _signalSessionSerialize(
  SignalSession object,
  IsarWriter writer,
  List<int> offsets,
  Map<Type, List<int>> allOffsets,
) {
  writer.writeString(offsets[0], object.addressName);
  writer.writeLong(offsets[1], object.deviceId);
  writer.writeLongList(offsets[2], object.serializedSession);
}

SignalSession _signalSessionDeserialize(
  Id id,
  IsarReader reader,
  List<int> offsets,
  Map<Type, List<int>> allOffsets,
) {
  final object = SignalSession();
  object.addressName = reader.readString(offsets[0]);
  object.deviceId = reader.readLong(offsets[1]);
  object.id = id;
  object.serializedSession = reader.readLongList(offsets[2]) ?? [];
  return object;
}

P _signalSessionDeserializeProp<P>(
  IsarReader reader,
  int propertyId,
  int offset,
  Map<Type, List<int>> allOffsets,
) {
  switch (propertyId) {
    case 0:
      return (reader.readString(offset)) as P;
    case 1:
      return (reader.readLong(offset)) as P;
    case 2:
      return (reader.readLongList(offset) ?? []) as P;
    default:
      throw IsarError('Unknown property with id $propertyId');
  }
}

Id _signalSessionGetId(SignalSession object) {
  return object.id;
}

List<IsarLinkBase<dynamic>> _signalSessionGetLinks(SignalSession object) {
  return [];
}

void _signalSessionAttach(
    IsarCollection<dynamic> col, Id id, SignalSession object) {
  object.id = id;
}

extension SignalSessionByIndex on IsarCollection<SignalSession> {
  Future<SignalSession?> getByAddressName(String addressName) {
    return getByIndex(r'addressName', [addressName]);
  }

  SignalSession? getByAddressNameSync(String addressName) {
    return getByIndexSync(r'addressName', [addressName]);
  }

  Future<bool> deleteByAddressName(String addressName) {
    return deleteByIndex(r'addressName', [addressName]);
  }

  bool deleteByAddressNameSync(String addressName) {
    return deleteByIndexSync(r'addressName', [addressName]);
  }

  Future<List<SignalSession?>> getAllByAddressName(
      List<String> addressNameValues) {
    final values = addressNameValues.map((e) => [e]).toList();
    return getAllByIndex(r'addressName', values);
  }

  List<SignalSession?> getAllByAddressNameSync(List<String> addressNameValues) {
    final values = addressNameValues.map((e) => [e]).toList();
    return getAllByIndexSync(r'addressName', values);
  }

  Future<int> deleteAllByAddressName(List<String> addressNameValues) {
    final values = addressNameValues.map((e) => [e]).toList();
    return deleteAllByIndex(r'addressName', values);
  }

  int deleteAllByAddressNameSync(List<String> addressNameValues) {
    final values = addressNameValues.map((e) => [e]).toList();
    return deleteAllByIndexSync(r'addressName', values);
  }

  Future<Id> putByAddressName(SignalSession object) {
    return putByIndex(r'addressName', object);
  }

  Id putByAddressNameSync(SignalSession object, {bool saveLinks = true}) {
    return putByIndexSync(r'addressName', object, saveLinks: saveLinks);
  }

  Future<List<Id>> putAllByAddressName(List<SignalSession> objects) {
    return putAllByIndex(r'addressName', objects);
  }

  List<Id> putAllByAddressNameSync(List<SignalSession> objects,
      {bool saveLinks = true}) {
    return putAllByIndexSync(r'addressName', objects, saveLinks: saveLinks);
  }
}

extension SignalSessionQueryWhereSort
    on QueryBuilder<SignalSession, SignalSession, QWhere> {
  QueryBuilder<SignalSession, SignalSession, QAfterWhere> anyId() {
    return QueryBuilder.apply(this, (query) {
      return query.addWhereClause(const IdWhereClause.any());
    });
  }
}

extension SignalSessionQueryWhere
    on QueryBuilder<SignalSession, SignalSession, QWhereClause> {
  QueryBuilder<SignalSession, SignalSession, QAfterWhereClause> idEqualTo(
      Id id) {
    return QueryBuilder.apply(this, (query) {
      return query.addWhereClause(IdWhereClause.between(
        lower: id,
        upper: id,
      ));
    });
  }

  QueryBuilder<SignalSession, SignalSession, QAfterWhereClause> idNotEqualTo(
      Id id) {
    return QueryBuilder.apply(this, (query) {
      if (query.whereSort == Sort.asc) {
        return query
            .addWhereClause(
              IdWhereClause.lessThan(upper: id, includeUpper: false),
            )
            .addWhereClause(
              IdWhereClause.greaterThan(lower: id, includeLower: false),
            );
      } else {
        return query
            .addWhereClause(
              IdWhereClause.greaterThan(lower: id, includeLower: false),
            )
            .addWhereClause(
              IdWhereClause.lessThan(upper: id, includeUpper: false),
            );
      }
    });
  }

  QueryBuilder<SignalSession, SignalSession, QAfterWhereClause> idGreaterThan(
      Id id,
      {bool include = false}) {
    return QueryBuilder.apply(this, (query) {
      return query.addWhereClause(
        IdWhereClause.greaterThan(lower: id, includeLower: include),
      );
    });
  }

  QueryBuilder<SignalSession, SignalSession, QAfterWhereClause> idLessThan(
      Id id,
      {bool include = false}) {
    return QueryBuilder.apply(this, (query) {
      return query.addWhereClause(
        IdWhereClause.lessThan(upper: id, includeUpper: include),
      );
    });
  }

  QueryBuilder<SignalSession, SignalSession, QAfterWhereClause> idBetween(
    Id lowerId,
    Id upperId, {
    bool includeLower = true,
    bool includeUpper = true,
  }) {
    return QueryBuilder.apply(this, (query) {
      return query.addWhereClause(IdWhereClause.between(
        lower: lowerId,
        includeLower: includeLower,
        upper: upperId,
        includeUpper: includeUpper,
      ));
    });
  }

  QueryBuilder<SignalSession, SignalSession, QAfterWhereClause>
      addressNameEqualTo(String addressName) {
    return QueryBuilder.apply(this, (query) {
      return query.addWhereClause(IndexWhereClause.equalTo(
        indexName: r'addressName',
        value: [addressName],
      ));
    });
  }

  QueryBuilder<SignalSession, SignalSession, QAfterWhereClause>
      addressNameNotEqualTo(String addressName) {
    return QueryBuilder.apply(this, (query) {
      if (query.whereSort == Sort.asc) {
        return query
            .addWhereClause(IndexWhereClause.between(
              indexName: r'addressName',
              lower: [],
              upper: [addressName],
              includeUpper: false,
            ))
            .addWhereClause(IndexWhereClause.between(
              indexName: r'addressName',
              lower: [addressName],
              includeLower: false,
              upper: [],
            ));
      } else {
        return query
            .addWhereClause(IndexWhereClause.between(
              indexName: r'addressName',
              lower: [addressName],
              includeLower: false,
              upper: [],
            ))
            .addWhereClause(IndexWhereClause.between(
              indexName: r'addressName',
              lower: [],
              upper: [addressName],
              includeUpper: false,
            ));
      }
    });
  }
}

extension SignalSessionQueryFilter
    on QueryBuilder<SignalSession, SignalSession, QFilterCondition> {
  QueryBuilder<SignalSession, SignalSession, QAfterFilterCondition>
      addressNameEqualTo(
    String value, {
    bool caseSensitive = true,
  }) {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(FilterCondition.equalTo(
        property: r'addressName',
        value: value,
        caseSensitive: caseSensitive,
      ));
    });
  }

  QueryBuilder<SignalSession, SignalSession, QAfterFilterCondition>
      addressNameGreaterThan(
    String value, {
    bool include = false,
    bool caseSensitive = true,
  }) {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(FilterCondition.greaterThan(
        include: include,
        property: r'addressName',
        value: value,
        caseSensitive: caseSensitive,
      ));
    });
  }

  QueryBuilder<SignalSession, SignalSession, QAfterFilterCondition>
      addressNameLessThan(
    String value, {
    bool include = false,
    bool caseSensitive = true,
  }) {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(FilterCondition.lessThan(
        include: include,
        property: r'addressName',
        value: value,
        caseSensitive: caseSensitive,
      ));
    });
  }

  QueryBuilder<SignalSession, SignalSession, QAfterFilterCondition>
      addressNameBetween(
    String lower,
    String upper, {
    bool includeLower = true,
    bool includeUpper = true,
    bool caseSensitive = true,
  }) {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(FilterCondition.between(
        property: r'addressName',
        lower: lower,
        includeLower: includeLower,
        upper: upper,
        includeUpper: includeUpper,
        caseSensitive: caseSensitive,
      ));
    });
  }

  QueryBuilder<SignalSession, SignalSession, QAfterFilterCondition>
      addressNameStartsWith(
    String value, {
    bool caseSensitive = true,
  }) {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(FilterCondition.startsWith(
        property: r'addressName',
        value: value,
        caseSensitive: caseSensitive,
      ));
    });
  }

  QueryBuilder<SignalSession, SignalSession, QAfterFilterCondition>
      addressNameEndsWith(
    String value, {
    bool caseSensitive = true,
  }) {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(FilterCondition.endsWith(
        property: r'addressName',
        value: value,
        caseSensitive: caseSensitive,
      ));
    });
  }

  QueryBuilder<SignalSession, SignalSession, QAfterFilterCondition>
      addressNameContains(String value, {bool caseSensitive = true}) {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(FilterCondition.contains(
        property: r'addressName',
        value: value,
        caseSensitive: caseSensitive,
      ));
    });
  }

  QueryBuilder<SignalSession, SignalSession, QAfterFilterCondition>
      addressNameMatches(String pattern, {bool caseSensitive = true}) {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(FilterCondition.matches(
        property: r'addressName',
        wildcard: pattern,
        caseSensitive: caseSensitive,
      ));
    });
  }

  QueryBuilder<SignalSession, SignalSession, QAfterFilterCondition>
      addressNameIsEmpty() {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(FilterCondition.equalTo(
        property: r'addressName',
        value: '',
      ));
    });
  }

  QueryBuilder<SignalSession, SignalSession, QAfterFilterCondition>
      addressNameIsNotEmpty() {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(FilterCondition.greaterThan(
        property: r'addressName',
        value: '',
      ));
    });
  }

  QueryBuilder<SignalSession, SignalSession, QAfterFilterCondition>
      deviceIdEqualTo(int value) {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(FilterCondition.equalTo(
        property: r'deviceId',
        value: value,
      ));
    });
  }

  QueryBuilder<SignalSession, SignalSession, QAfterFilterCondition>
      deviceIdGreaterThan(
    int value, {
    bool include = false,
  }) {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(FilterCondition.greaterThan(
        include: include,
        property: r'deviceId',
        value: value,
      ));
    });
  }

  QueryBuilder<SignalSession, SignalSession, QAfterFilterCondition>
      deviceIdLessThan(
    int value, {
    bool include = false,
  }) {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(FilterCondition.lessThan(
        include: include,
        property: r'deviceId',
        value: value,
      ));
    });
  }

  QueryBuilder<SignalSession, SignalSession, QAfterFilterCondition>
      deviceIdBetween(
    int lower,
    int upper, {
    bool includeLower = true,
    bool includeUpper = true,
  }) {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(FilterCondition.between(
        property: r'deviceId',
        lower: lower,
        includeLower: includeLower,
        upper: upper,
        includeUpper: includeUpper,
      ));
    });
  }

  QueryBuilder<SignalSession, SignalSession, QAfterFilterCondition> idEqualTo(
      Id value) {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(FilterCondition.equalTo(
        property: r'id',
        value: value,
      ));
    });
  }

  QueryBuilder<SignalSession, SignalSession, QAfterFilterCondition>
      idGreaterThan(
    Id value, {
    bool include = false,
  }) {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(FilterCondition.greaterThan(
        include: include,
        property: r'id',
        value: value,
      ));
    });
  }

  QueryBuilder<SignalSession, SignalSession, QAfterFilterCondition> idLessThan(
    Id value, {
    bool include = false,
  }) {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(FilterCondition.lessThan(
        include: include,
        property: r'id',
        value: value,
      ));
    });
  }

  QueryBuilder<SignalSession, SignalSession, QAfterFilterCondition> idBetween(
    Id lower,
    Id upper, {
    bool includeLower = true,
    bool includeUpper = true,
  }) {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(FilterCondition.between(
        property: r'id',
        lower: lower,
        includeLower: includeLower,
        upper: upper,
        includeUpper: includeUpper,
      ));
    });
  }

  QueryBuilder<SignalSession, SignalSession, QAfterFilterCondition>
      serializedSessionElementEqualTo(int value) {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(FilterCondition.equalTo(
        property: r'serializedSession',
        value: value,
      ));
    });
  }

  QueryBuilder<SignalSession, SignalSession, QAfterFilterCondition>
      serializedSessionElementGreaterThan(
    int value, {
    bool include = false,
  }) {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(FilterCondition.greaterThan(
        include: include,
        property: r'serializedSession',
        value: value,
      ));
    });
  }

  QueryBuilder<SignalSession, SignalSession, QAfterFilterCondition>
      serializedSessionElementLessThan(
    int value, {
    bool include = false,
  }) {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(FilterCondition.lessThan(
        include: include,
        property: r'serializedSession',
        value: value,
      ));
    });
  }

  QueryBuilder<SignalSession, SignalSession, QAfterFilterCondition>
      serializedSessionElementBetween(
    int lower,
    int upper, {
    bool includeLower = true,
    bool includeUpper = true,
  }) {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(FilterCondition.between(
        property: r'serializedSession',
        lower: lower,
        includeLower: includeLower,
        upper: upper,
        includeUpper: includeUpper,
      ));
    });
  }

  QueryBuilder<SignalSession, SignalSession, QAfterFilterCondition>
      serializedSessionLengthEqualTo(int length) {
    return QueryBuilder.apply(this, (query) {
      return query.listLength(
        r'serializedSession',
        length,
        true,
        length,
        true,
      );
    });
  }

  QueryBuilder<SignalSession, SignalSession, QAfterFilterCondition>
      serializedSessionIsEmpty() {
    return QueryBuilder.apply(this, (query) {
      return query.listLength(
        r'serializedSession',
        0,
        true,
        0,
        true,
      );
    });
  }

  QueryBuilder<SignalSession, SignalSession, QAfterFilterCondition>
      serializedSessionIsNotEmpty() {
    return QueryBuilder.apply(this, (query) {
      return query.listLength(
        r'serializedSession',
        0,
        false,
        999999,
        true,
      );
    });
  }

  QueryBuilder<SignalSession, SignalSession, QAfterFilterCondition>
      serializedSessionLengthLessThan(
    int length, {
    bool include = false,
  }) {
    return QueryBuilder.apply(this, (query) {
      return query.listLength(
        r'serializedSession',
        0,
        true,
        length,
        include,
      );
    });
  }

  QueryBuilder<SignalSession, SignalSession, QAfterFilterCondition>
      serializedSessionLengthGreaterThan(
    int length, {
    bool include = false,
  }) {
    return QueryBuilder.apply(this, (query) {
      return query.listLength(
        r'serializedSession',
        length,
        include,
        999999,
        true,
      );
    });
  }

  QueryBuilder<SignalSession, SignalSession, QAfterFilterCondition>
      serializedSessionLengthBetween(
    int lower,
    int upper, {
    bool includeLower = true,
    bool includeUpper = true,
  }) {
    return QueryBuilder.apply(this, (query) {
      return query.listLength(
        r'serializedSession',
        lower,
        includeLower,
        upper,
        includeUpper,
      );
    });
  }
}

extension SignalSessionQueryObject
    on QueryBuilder<SignalSession, SignalSession, QFilterCondition> {}

extension SignalSessionQueryLinks
    on QueryBuilder<SignalSession, SignalSession, QFilterCondition> {}

extension SignalSessionQuerySortBy
    on QueryBuilder<SignalSession, SignalSession, QSortBy> {
  QueryBuilder<SignalSession, SignalSession, QAfterSortBy> sortByAddressName() {
    return QueryBuilder.apply(this, (query) {
      return query.addSortBy(r'addressName', Sort.asc);
    });
  }

  QueryBuilder<SignalSession, SignalSession, QAfterSortBy>
      sortByAddressNameDesc() {
    return QueryBuilder.apply(this, (query) {
      return query.addSortBy(r'addressName', Sort.desc);
    });
  }

  QueryBuilder<SignalSession, SignalSession, QAfterSortBy> sortByDeviceId() {
    return QueryBuilder.apply(this, (query) {
      return query.addSortBy(r'deviceId', Sort.asc);
    });
  }

  QueryBuilder<SignalSession, SignalSession, QAfterSortBy>
      sortByDeviceIdDesc() {
    return QueryBuilder.apply(this, (query) {
      return query.addSortBy(r'deviceId', Sort.desc);
    });
  }
}

extension SignalSessionQuerySortThenBy
    on QueryBuilder<SignalSession, SignalSession, QSortThenBy> {
  QueryBuilder<SignalSession, SignalSession, QAfterSortBy> thenByAddressName() {
    return QueryBuilder.apply(this, (query) {
      return query.addSortBy(r'addressName', Sort.asc);
    });
  }

  QueryBuilder<SignalSession, SignalSession, QAfterSortBy>
      thenByAddressNameDesc() {
    return QueryBuilder.apply(this, (query) {
      return query.addSortBy(r'addressName', Sort.desc);
    });
  }

  QueryBuilder<SignalSession, SignalSession, QAfterSortBy> thenByDeviceId() {
    return QueryBuilder.apply(this, (query) {
      return query.addSortBy(r'deviceId', Sort.asc);
    });
  }

  QueryBuilder<SignalSession, SignalSession, QAfterSortBy>
      thenByDeviceIdDesc() {
    return QueryBuilder.apply(this, (query) {
      return query.addSortBy(r'deviceId', Sort.desc);
    });
  }

  QueryBuilder<SignalSession, SignalSession, QAfterSortBy> thenById() {
    return QueryBuilder.apply(this, (query) {
      return query.addSortBy(r'id', Sort.asc);
    });
  }

  QueryBuilder<SignalSession, SignalSession, QAfterSortBy> thenByIdDesc() {
    return QueryBuilder.apply(this, (query) {
      return query.addSortBy(r'id', Sort.desc);
    });
  }
}

extension SignalSessionQueryWhereDistinct
    on QueryBuilder<SignalSession, SignalSession, QDistinct> {
  QueryBuilder<SignalSession, SignalSession, QDistinct> distinctByAddressName(
      {bool caseSensitive = true}) {
    return QueryBuilder.apply(this, (query) {
      return query.addDistinctBy(r'addressName', caseSensitive: caseSensitive);
    });
  }

  QueryBuilder<SignalSession, SignalSession, QDistinct> distinctByDeviceId() {
    return QueryBuilder.apply(this, (query) {
      return query.addDistinctBy(r'deviceId');
    });
  }

  QueryBuilder<SignalSession, SignalSession, QDistinct>
      distinctBySerializedSession() {
    return QueryBuilder.apply(this, (query) {
      return query.addDistinctBy(r'serializedSession');
    });
  }
}

extension SignalSessionQueryProperty
    on QueryBuilder<SignalSession, SignalSession, QQueryProperty> {
  QueryBuilder<SignalSession, int, QQueryOperations> idProperty() {
    return QueryBuilder.apply(this, (query) {
      return query.addPropertyName(r'id');
    });
  }

  QueryBuilder<SignalSession, String, QQueryOperations> addressNameProperty() {
    return QueryBuilder.apply(this, (query) {
      return query.addPropertyName(r'addressName');
    });
  }

  QueryBuilder<SignalSession, int, QQueryOperations> deviceIdProperty() {
    return QueryBuilder.apply(this, (query) {
      return query.addPropertyName(r'deviceId');
    });
  }

  QueryBuilder<SignalSession, List<int>, QQueryOperations>
      serializedSessionProperty() {
    return QueryBuilder.apply(this, (query) {
      return query.addPropertyName(r'serializedSession');
    });
  }
}

// coverage:ignore-file
// ignore_for_file: duplicate_ignore, non_constant_identifier_names, constant_identifier_names, invalid_use_of_protected_member, unnecessary_cast, prefer_const_constructors, lines_longer_than_80_chars, require_trailing_commas, inference_failure_on_function_invocation, unnecessary_parenthesis, unnecessary_raw_strings, unnecessary_null_checks, join_return_with_assignment, prefer_final_locals, avoid_js_rounded_ints, avoid_positional_boolean_parameters, always_specify_types

extension GetSignalPreKeyCollection on Isar {
  IsarCollection<SignalPreKey> get signalPreKeys => this.collection();
}

const SignalPreKeySchema = CollectionSchema(
  name: r'SignalPreKey',
  id: 7383575601402785698,
  properties: {
    r'serializedKey': PropertySchema(
      id: 0,
      name: r'serializedKey',
      type: IsarType.longList,
    )
  },
  estimateSize: _signalPreKeyEstimateSize,
  serialize: _signalPreKeySerialize,
  deserialize: _signalPreKeyDeserialize,
  deserializeProp: _signalPreKeyDeserializeProp,
  idName: r'id',
  indexes: {},
  links: {},
  embeddedSchemas: {},
  getId: _signalPreKeyGetId,
  getLinks: _signalPreKeyGetLinks,
  attach: _signalPreKeyAttach,
  version: '3.1.0+1',
);

int _signalPreKeyEstimateSize(
  SignalPreKey object,
  List<int> offsets,
  Map<Type, List<int>> allOffsets,
) {
  var bytesCount = offsets.last;
  bytesCount += 3 + object.serializedKey.length * 8;
  return bytesCount;
}

void _signalPreKeySerialize(
  SignalPreKey object,
  IsarWriter writer,
  List<int> offsets,
  Map<Type, List<int>> allOffsets,
) {
  writer.writeLongList(offsets[0], object.serializedKey);
}

SignalPreKey _signalPreKeyDeserialize(
  Id id,
  IsarReader reader,
  List<int> offsets,
  Map<Type, List<int>> allOffsets,
) {
  final object = SignalPreKey();
  object.id = id;
  object.serializedKey = reader.readLongList(offsets[0]) ?? [];
  return object;
}

P _signalPreKeyDeserializeProp<P>(
  IsarReader reader,
  int propertyId,
  int offset,
  Map<Type, List<int>> allOffsets,
) {
  switch (propertyId) {
    case 0:
      return (reader.readLongList(offset) ?? []) as P;
    default:
      throw IsarError('Unknown property with id $propertyId');
  }
}

Id _signalPreKeyGetId(SignalPreKey object) {
  return object.id;
}

List<IsarLinkBase<dynamic>> _signalPreKeyGetLinks(SignalPreKey object) {
  return [];
}

void _signalPreKeyAttach(
    IsarCollection<dynamic> col, Id id, SignalPreKey object) {
  object.id = id;
}

extension SignalPreKeyQueryWhereSort
    on QueryBuilder<SignalPreKey, SignalPreKey, QWhere> {
  QueryBuilder<SignalPreKey, SignalPreKey, QAfterWhere> anyId() {
    return QueryBuilder.apply(this, (query) {
      return query.addWhereClause(const IdWhereClause.any());
    });
  }
}

extension SignalPreKeyQueryWhere
    on QueryBuilder<SignalPreKey, SignalPreKey, QWhereClause> {
  QueryBuilder<SignalPreKey, SignalPreKey, QAfterWhereClause> idEqualTo(Id id) {
    return QueryBuilder.apply(this, (query) {
      return query.addWhereClause(IdWhereClause.between(
        lower: id,
        upper: id,
      ));
    });
  }

  QueryBuilder<SignalPreKey, SignalPreKey, QAfterWhereClause> idNotEqualTo(
      Id id) {
    return QueryBuilder.apply(this, (query) {
      if (query.whereSort == Sort.asc) {
        return query
            .addWhereClause(
              IdWhereClause.lessThan(upper: id, includeUpper: false),
            )
            .addWhereClause(
              IdWhereClause.greaterThan(lower: id, includeLower: false),
            );
      } else {
        return query
            .addWhereClause(
              IdWhereClause.greaterThan(lower: id, includeLower: false),
            )
            .addWhereClause(
              IdWhereClause.lessThan(upper: id, includeUpper: false),
            );
      }
    });
  }

  QueryBuilder<SignalPreKey, SignalPreKey, QAfterWhereClause> idGreaterThan(
      Id id,
      {bool include = false}) {
    return QueryBuilder.apply(this, (query) {
      return query.addWhereClause(
        IdWhereClause.greaterThan(lower: id, includeLower: include),
      );
    });
  }

  QueryBuilder<SignalPreKey, SignalPreKey, QAfterWhereClause> idLessThan(Id id,
      {bool include = false}) {
    return QueryBuilder.apply(this, (query) {
      return query.addWhereClause(
        IdWhereClause.lessThan(upper: id, includeUpper: include),
      );
    });
  }

  QueryBuilder<SignalPreKey, SignalPreKey, QAfterWhereClause> idBetween(
    Id lowerId,
    Id upperId, {
    bool includeLower = true,
    bool includeUpper = true,
  }) {
    return QueryBuilder.apply(this, (query) {
      return query.addWhereClause(IdWhereClause.between(
        lower: lowerId,
        includeLower: includeLower,
        upper: upperId,
        includeUpper: includeUpper,
      ));
    });
  }
}

extension SignalPreKeyQueryFilter
    on QueryBuilder<SignalPreKey, SignalPreKey, QFilterCondition> {
  QueryBuilder<SignalPreKey, SignalPreKey, QAfterFilterCondition> idEqualTo(
      Id value) {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(FilterCondition.equalTo(
        property: r'id',
        value: value,
      ));
    });
  }

  QueryBuilder<SignalPreKey, SignalPreKey, QAfterFilterCondition> idGreaterThan(
    Id value, {
    bool include = false,
  }) {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(FilterCondition.greaterThan(
        include: include,
        property: r'id',
        value: value,
      ));
    });
  }

  QueryBuilder<SignalPreKey, SignalPreKey, QAfterFilterCondition> idLessThan(
    Id value, {
    bool include = false,
  }) {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(FilterCondition.lessThan(
        include: include,
        property: r'id',
        value: value,
      ));
    });
  }

  QueryBuilder<SignalPreKey, SignalPreKey, QAfterFilterCondition> idBetween(
    Id lower,
    Id upper, {
    bool includeLower = true,
    bool includeUpper = true,
  }) {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(FilterCondition.between(
        property: r'id',
        lower: lower,
        includeLower: includeLower,
        upper: upper,
        includeUpper: includeUpper,
      ));
    });
  }

  QueryBuilder<SignalPreKey, SignalPreKey, QAfterFilterCondition>
      serializedKeyElementEqualTo(int value) {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(FilterCondition.equalTo(
        property: r'serializedKey',
        value: value,
      ));
    });
  }

  QueryBuilder<SignalPreKey, SignalPreKey, QAfterFilterCondition>
      serializedKeyElementGreaterThan(
    int value, {
    bool include = false,
  }) {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(FilterCondition.greaterThan(
        include: include,
        property: r'serializedKey',
        value: value,
      ));
    });
  }

  QueryBuilder<SignalPreKey, SignalPreKey, QAfterFilterCondition>
      serializedKeyElementLessThan(
    int value, {
    bool include = false,
  }) {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(FilterCondition.lessThan(
        include: include,
        property: r'serializedKey',
        value: value,
      ));
    });
  }

  QueryBuilder<SignalPreKey, SignalPreKey, QAfterFilterCondition>
      serializedKeyElementBetween(
    int lower,
    int upper, {
    bool includeLower = true,
    bool includeUpper = true,
  }) {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(FilterCondition.between(
        property: r'serializedKey',
        lower: lower,
        includeLower: includeLower,
        upper: upper,
        includeUpper: includeUpper,
      ));
    });
  }

  QueryBuilder<SignalPreKey, SignalPreKey, QAfterFilterCondition>
      serializedKeyLengthEqualTo(int length) {
    return QueryBuilder.apply(this, (query) {
      return query.listLength(
        r'serializedKey',
        length,
        true,
        length,
        true,
      );
    });
  }

  QueryBuilder<SignalPreKey, SignalPreKey, QAfterFilterCondition>
      serializedKeyIsEmpty() {
    return QueryBuilder.apply(this, (query) {
      return query.listLength(
        r'serializedKey',
        0,
        true,
        0,
        true,
      );
    });
  }

  QueryBuilder<SignalPreKey, SignalPreKey, QAfterFilterCondition>
      serializedKeyIsNotEmpty() {
    return QueryBuilder.apply(this, (query) {
      return query.listLength(
        r'serializedKey',
        0,
        false,
        999999,
        true,
      );
    });
  }

  QueryBuilder<SignalPreKey, SignalPreKey, QAfterFilterCondition>
      serializedKeyLengthLessThan(
    int length, {
    bool include = false,
  }) {
    return QueryBuilder.apply(this, (query) {
      return query.listLength(
        r'serializedKey',
        0,
        true,
        length,
        include,
      );
    });
  }

  QueryBuilder<SignalPreKey, SignalPreKey, QAfterFilterCondition>
      serializedKeyLengthGreaterThan(
    int length, {
    bool include = false,
  }) {
    return QueryBuilder.apply(this, (query) {
      return query.listLength(
        r'serializedKey',
        length,
        include,
        999999,
        true,
      );
    });
  }

  QueryBuilder<SignalPreKey, SignalPreKey, QAfterFilterCondition>
      serializedKeyLengthBetween(
    int lower,
    int upper, {
    bool includeLower = true,
    bool includeUpper = true,
  }) {
    return QueryBuilder.apply(this, (query) {
      return query.listLength(
        r'serializedKey',
        lower,
        includeLower,
        upper,
        includeUpper,
      );
    });
  }
}

extension SignalPreKeyQueryObject
    on QueryBuilder<SignalPreKey, SignalPreKey, QFilterCondition> {}

extension SignalPreKeyQueryLinks
    on QueryBuilder<SignalPreKey, SignalPreKey, QFilterCondition> {}

extension SignalPreKeyQuerySortBy
    on QueryBuilder<SignalPreKey, SignalPreKey, QSortBy> {}

extension SignalPreKeyQuerySortThenBy
    on QueryBuilder<SignalPreKey, SignalPreKey, QSortThenBy> {
  QueryBuilder<SignalPreKey, SignalPreKey, QAfterSortBy> thenById() {
    return QueryBuilder.apply(this, (query) {
      return query.addSortBy(r'id', Sort.asc);
    });
  }

  QueryBuilder<SignalPreKey, SignalPreKey, QAfterSortBy> thenByIdDesc() {
    return QueryBuilder.apply(this, (query) {
      return query.addSortBy(r'id', Sort.desc);
    });
  }
}

extension SignalPreKeyQueryWhereDistinct
    on QueryBuilder<SignalPreKey, SignalPreKey, QDistinct> {
  QueryBuilder<SignalPreKey, SignalPreKey, QDistinct>
      distinctBySerializedKey() {
    return QueryBuilder.apply(this, (query) {
      return query.addDistinctBy(r'serializedKey');
    });
  }
}

extension SignalPreKeyQueryProperty
    on QueryBuilder<SignalPreKey, SignalPreKey, QQueryProperty> {
  QueryBuilder<SignalPreKey, int, QQueryOperations> idProperty() {
    return QueryBuilder.apply(this, (query) {
      return query.addPropertyName(r'id');
    });
  }

  QueryBuilder<SignalPreKey, List<int>, QQueryOperations>
      serializedKeyProperty() {
    return QueryBuilder.apply(this, (query) {
      return query.addPropertyName(r'serializedKey');
    });
  }
}

// coverage:ignore-file
// ignore_for_file: duplicate_ignore, non_constant_identifier_names, constant_identifier_names, invalid_use_of_protected_member, unnecessary_cast, prefer_const_constructors, lines_longer_than_80_chars, require_trailing_commas, inference_failure_on_function_invocation, unnecessary_parenthesis, unnecessary_raw_strings, unnecessary_null_checks, join_return_with_assignment, prefer_final_locals, avoid_js_rounded_ints, avoid_positional_boolean_parameters, always_specify_types

extension GetSignalSignedPreKeyCollection on Isar {
  IsarCollection<SignalSignedPreKey> get signalSignedPreKeys =>
      this.collection();
}

const SignalSignedPreKeySchema = CollectionSchema(
  name: r'SignalSignedPreKey',
  id: -6935624005744421809,
  properties: {
    r'serializedKey': PropertySchema(
      id: 0,
      name: r'serializedKey',
      type: IsarType.longList,
    )
  },
  estimateSize: _signalSignedPreKeyEstimateSize,
  serialize: _signalSignedPreKeySerialize,
  deserialize: _signalSignedPreKeyDeserialize,
  deserializeProp: _signalSignedPreKeyDeserializeProp,
  idName: r'id',
  indexes: {},
  links: {},
  embeddedSchemas: {},
  getId: _signalSignedPreKeyGetId,
  getLinks: _signalSignedPreKeyGetLinks,
  attach: _signalSignedPreKeyAttach,
  version: '3.1.0+1',
);

int _signalSignedPreKeyEstimateSize(
  SignalSignedPreKey object,
  List<int> offsets,
  Map<Type, List<int>> allOffsets,
) {
  var bytesCount = offsets.last;
  bytesCount += 3 + object.serializedKey.length * 8;
  return bytesCount;
}

void _signalSignedPreKeySerialize(
  SignalSignedPreKey object,
  IsarWriter writer,
  List<int> offsets,
  Map<Type, List<int>> allOffsets,
) {
  writer.writeLongList(offsets[0], object.serializedKey);
}

SignalSignedPreKey _signalSignedPreKeyDeserialize(
  Id id,
  IsarReader reader,
  List<int> offsets,
  Map<Type, List<int>> allOffsets,
) {
  final object = SignalSignedPreKey();
  object.id = id;
  object.serializedKey = reader.readLongList(offsets[0]) ?? [];
  return object;
}

P _signalSignedPreKeyDeserializeProp<P>(
  IsarReader reader,
  int propertyId,
  int offset,
  Map<Type, List<int>> allOffsets,
) {
  switch (propertyId) {
    case 0:
      return (reader.readLongList(offset) ?? []) as P;
    default:
      throw IsarError('Unknown property with id $propertyId');
  }
}

Id _signalSignedPreKeyGetId(SignalSignedPreKey object) {
  return object.id;
}

List<IsarLinkBase<dynamic>> _signalSignedPreKeyGetLinks(
    SignalSignedPreKey object) {
  return [];
}

void _signalSignedPreKeyAttach(
    IsarCollection<dynamic> col, Id id, SignalSignedPreKey object) {
  object.id = id;
}

extension SignalSignedPreKeyQueryWhereSort
    on QueryBuilder<SignalSignedPreKey, SignalSignedPreKey, QWhere> {
  QueryBuilder<SignalSignedPreKey, SignalSignedPreKey, QAfterWhere> anyId() {
    return QueryBuilder.apply(this, (query) {
      return query.addWhereClause(const IdWhereClause.any());
    });
  }
}

extension SignalSignedPreKeyQueryWhere
    on QueryBuilder<SignalSignedPreKey, SignalSignedPreKey, QWhereClause> {
  QueryBuilder<SignalSignedPreKey, SignalSignedPreKey, QAfterWhereClause>
      idEqualTo(Id id) {
    return QueryBuilder.apply(this, (query) {
      return query.addWhereClause(IdWhereClause.between(
        lower: id,
        upper: id,
      ));
    });
  }

  QueryBuilder<SignalSignedPreKey, SignalSignedPreKey, QAfterWhereClause>
      idNotEqualTo(Id id) {
    return QueryBuilder.apply(this, (query) {
      if (query.whereSort == Sort.asc) {
        return query
            .addWhereClause(
              IdWhereClause.lessThan(upper: id, includeUpper: false),
            )
            .addWhereClause(
              IdWhereClause.greaterThan(lower: id, includeLower: false),
            );
      } else {
        return query
            .addWhereClause(
              IdWhereClause.greaterThan(lower: id, includeLower: false),
            )
            .addWhereClause(
              IdWhereClause.lessThan(upper: id, includeUpper: false),
            );
      }
    });
  }

  QueryBuilder<SignalSignedPreKey, SignalSignedPreKey, QAfterWhereClause>
      idGreaterThan(Id id, {bool include = false}) {
    return QueryBuilder.apply(this, (query) {
      return query.addWhereClause(
        IdWhereClause.greaterThan(lower: id, includeLower: include),
      );
    });
  }

  QueryBuilder<SignalSignedPreKey, SignalSignedPreKey, QAfterWhereClause>
      idLessThan(Id id, {bool include = false}) {
    return QueryBuilder.apply(this, (query) {
      return query.addWhereClause(
        IdWhereClause.lessThan(upper: id, includeUpper: include),
      );
    });
  }

  QueryBuilder<SignalSignedPreKey, SignalSignedPreKey, QAfterWhereClause>
      idBetween(
    Id lowerId,
    Id upperId, {
    bool includeLower = true,
    bool includeUpper = true,
  }) {
    return QueryBuilder.apply(this, (query) {
      return query.addWhereClause(IdWhereClause.between(
        lower: lowerId,
        includeLower: includeLower,
        upper: upperId,
        includeUpper: includeUpper,
      ));
    });
  }
}

extension SignalSignedPreKeyQueryFilter
    on QueryBuilder<SignalSignedPreKey, SignalSignedPreKey, QFilterCondition> {
  QueryBuilder<SignalSignedPreKey, SignalSignedPreKey, QAfterFilterCondition>
      idEqualTo(Id value) {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(FilterCondition.equalTo(
        property: r'id',
        value: value,
      ));
    });
  }

  QueryBuilder<SignalSignedPreKey, SignalSignedPreKey, QAfterFilterCondition>
      idGreaterThan(
    Id value, {
    bool include = false,
  }) {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(FilterCondition.greaterThan(
        include: include,
        property: r'id',
        value: value,
      ));
    });
  }

  QueryBuilder<SignalSignedPreKey, SignalSignedPreKey, QAfterFilterCondition>
      idLessThan(
    Id value, {
    bool include = false,
  }) {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(FilterCondition.lessThan(
        include: include,
        property: r'id',
        value: value,
      ));
    });
  }

  QueryBuilder<SignalSignedPreKey, SignalSignedPreKey, QAfterFilterCondition>
      idBetween(
    Id lower,
    Id upper, {
    bool includeLower = true,
    bool includeUpper = true,
  }) {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(FilterCondition.between(
        property: r'id',
        lower: lower,
        includeLower: includeLower,
        upper: upper,
        includeUpper: includeUpper,
      ));
    });
  }

  QueryBuilder<SignalSignedPreKey, SignalSignedPreKey, QAfterFilterCondition>
      serializedKeyElementEqualTo(int value) {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(FilterCondition.equalTo(
        property: r'serializedKey',
        value: value,
      ));
    });
  }

  QueryBuilder<SignalSignedPreKey, SignalSignedPreKey, QAfterFilterCondition>
      serializedKeyElementGreaterThan(
    int value, {
    bool include = false,
  }) {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(FilterCondition.greaterThan(
        include: include,
        property: r'serializedKey',
        value: value,
      ));
    });
  }

  QueryBuilder<SignalSignedPreKey, SignalSignedPreKey, QAfterFilterCondition>
      serializedKeyElementLessThan(
    int value, {
    bool include = false,
  }) {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(FilterCondition.lessThan(
        include: include,
        property: r'serializedKey',
        value: value,
      ));
    });
  }

  QueryBuilder<SignalSignedPreKey, SignalSignedPreKey, QAfterFilterCondition>
      serializedKeyElementBetween(
    int lower,
    int upper, {
    bool includeLower = true,
    bool includeUpper = true,
  }) {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(FilterCondition.between(
        property: r'serializedKey',
        lower: lower,
        includeLower: includeLower,
        upper: upper,
        includeUpper: includeUpper,
      ));
    });
  }

  QueryBuilder<SignalSignedPreKey, SignalSignedPreKey, QAfterFilterCondition>
      serializedKeyLengthEqualTo(int length) {
    return QueryBuilder.apply(this, (query) {
      return query.listLength(
        r'serializedKey',
        length,
        true,
        length,
        true,
      );
    });
  }

  QueryBuilder<SignalSignedPreKey, SignalSignedPreKey, QAfterFilterCondition>
      serializedKeyIsEmpty() {
    return QueryBuilder.apply(this, (query) {
      return query.listLength(
        r'serializedKey',
        0,
        true,
        0,
        true,
      );
    });
  }

  QueryBuilder<SignalSignedPreKey, SignalSignedPreKey, QAfterFilterCondition>
      serializedKeyIsNotEmpty() {
    return QueryBuilder.apply(this, (query) {
      return query.listLength(
        r'serializedKey',
        0,
        false,
        999999,
        true,
      );
    });
  }

  QueryBuilder<SignalSignedPreKey, SignalSignedPreKey, QAfterFilterCondition>
      serializedKeyLengthLessThan(
    int length, {
    bool include = false,
  }) {
    return QueryBuilder.apply(this, (query) {
      return query.listLength(
        r'serializedKey',
        0,
        true,
        length,
        include,
      );
    });
  }

  QueryBuilder<SignalSignedPreKey, SignalSignedPreKey, QAfterFilterCondition>
      serializedKeyLengthGreaterThan(
    int length, {
    bool include = false,
  }) {
    return QueryBuilder.apply(this, (query) {
      return query.listLength(
        r'serializedKey',
        length,
        include,
        999999,
        true,
      );
    });
  }

  QueryBuilder<SignalSignedPreKey, SignalSignedPreKey, QAfterFilterCondition>
      serializedKeyLengthBetween(
    int lower,
    int upper, {
    bool includeLower = true,
    bool includeUpper = true,
  }) {
    return QueryBuilder.apply(this, (query) {
      return query.listLength(
        r'serializedKey',
        lower,
        includeLower,
        upper,
        includeUpper,
      );
    });
  }
}

extension SignalSignedPreKeyQueryObject
    on QueryBuilder<SignalSignedPreKey, SignalSignedPreKey, QFilterCondition> {}

extension SignalSignedPreKeyQueryLinks
    on QueryBuilder<SignalSignedPreKey, SignalSignedPreKey, QFilterCondition> {}

extension SignalSignedPreKeyQuerySortBy
    on QueryBuilder<SignalSignedPreKey, SignalSignedPreKey, QSortBy> {}

extension SignalSignedPreKeyQuerySortThenBy
    on QueryBuilder<SignalSignedPreKey, SignalSignedPreKey, QSortThenBy> {
  QueryBuilder<SignalSignedPreKey, SignalSignedPreKey, QAfterSortBy>
      thenById() {
    return QueryBuilder.apply(this, (query) {
      return query.addSortBy(r'id', Sort.asc);
    });
  }

  QueryBuilder<SignalSignedPreKey, SignalSignedPreKey, QAfterSortBy>
      thenByIdDesc() {
    return QueryBuilder.apply(this, (query) {
      return query.addSortBy(r'id', Sort.desc);
    });
  }
}

extension SignalSignedPreKeyQueryWhereDistinct
    on QueryBuilder<SignalSignedPreKey, SignalSignedPreKey, QDistinct> {
  QueryBuilder<SignalSignedPreKey, SignalSignedPreKey, QDistinct>
      distinctBySerializedKey() {
    return QueryBuilder.apply(this, (query) {
      return query.addDistinctBy(r'serializedKey');
    });
  }
}

extension SignalSignedPreKeyQueryProperty
    on QueryBuilder<SignalSignedPreKey, SignalSignedPreKey, QQueryProperty> {
  QueryBuilder<SignalSignedPreKey, int, QQueryOperations> idProperty() {
    return QueryBuilder.apply(this, (query) {
      return query.addPropertyName(r'id');
    });
  }

  QueryBuilder<SignalSignedPreKey, List<int>, QQueryOperations>
      serializedKeyProperty() {
    return QueryBuilder.apply(this, (query) {
      return query.addPropertyName(r'serializedKey');
    });
  }
}

// coverage:ignore-file
// ignore_for_file: duplicate_ignore, non_constant_identifier_names, constant_identifier_names, invalid_use_of_protected_member, unnecessary_cast, prefer_const_constructors, lines_longer_than_80_chars, require_trailing_commas, inference_failure_on_function_invocation, unnecessary_parenthesis, unnecessary_raw_strings, unnecessary_null_checks, join_return_with_assignment, prefer_final_locals, avoid_js_rounded_ints, avoid_positional_boolean_parameters, always_specify_types

extension GetSignalIdentityCollection on Isar {
  IsarCollection<SignalIdentity> get signalIdentitys => this.collection();
}

const SignalIdentitySchema = CollectionSchema(
  name: r'SignalIdentity',
  id: 9079581348582898180,
  properties: {
    r'addressName': PropertySchema(
      id: 0,
      name: r'addressName',
      type: IsarType.string,
    ),
    r'identityKey': PropertySchema(
      id: 1,
      name: r'identityKey',
      type: IsarType.longList,
    )
  },
  estimateSize: _signalIdentityEstimateSize,
  serialize: _signalIdentitySerialize,
  deserialize: _signalIdentityDeserialize,
  deserializeProp: _signalIdentityDeserializeProp,
  idName: r'id',
  indexes: {
    r'addressName': IndexSchema(
      id: 9175263881703466986,
      name: r'addressName',
      unique: true,
      replace: true,
      properties: [
        IndexPropertySchema(
          name: r'addressName',
          type: IndexType.hash,
          caseSensitive: true,
        )
      ],
    )
  },
  links: {},
  embeddedSchemas: {},
  getId: _signalIdentityGetId,
  getLinks: _signalIdentityGetLinks,
  attach: _signalIdentityAttach,
  version: '3.1.0+1',
);

int _signalIdentityEstimateSize(
  SignalIdentity object,
  List<int> offsets,
  Map<Type, List<int>> allOffsets,
) {
  var bytesCount = offsets.last;
  bytesCount += 3 + object.addressName.length * 3;
  bytesCount += 3 + object.identityKey.length * 8;
  return bytesCount;
}

void _signalIdentitySerialize(
  SignalIdentity object,
  IsarWriter writer,
  List<int> offsets,
  Map<Type, List<int>> allOffsets,
) {
  writer.writeString(offsets[0], object.addressName);
  writer.writeLongList(offsets[1], object.identityKey);
}

SignalIdentity _signalIdentityDeserialize(
  Id id,
  IsarReader reader,
  List<int> offsets,
  Map<Type, List<int>> allOffsets,
) {
  final object = SignalIdentity();
  object.addressName = reader.readString(offsets[0]);
  object.id = id;
  object.identityKey = reader.readLongList(offsets[1]) ?? [];
  return object;
}

P _signalIdentityDeserializeProp<P>(
  IsarReader reader,
  int propertyId,
  int offset,
  Map<Type, List<int>> allOffsets,
) {
  switch (propertyId) {
    case 0:
      return (reader.readString(offset)) as P;
    case 1:
      return (reader.readLongList(offset) ?? []) as P;
    default:
      throw IsarError('Unknown property with id $propertyId');
  }
}

Id _signalIdentityGetId(SignalIdentity object) {
  return object.id;
}

List<IsarLinkBase<dynamic>> _signalIdentityGetLinks(SignalIdentity object) {
  return [];
}

void _signalIdentityAttach(
    IsarCollection<dynamic> col, Id id, SignalIdentity object) {
  object.id = id;
}

extension SignalIdentityByIndex on IsarCollection<SignalIdentity> {
  Future<SignalIdentity?> getByAddressName(String addressName) {
    return getByIndex(r'addressName', [addressName]);
  }

  SignalIdentity? getByAddressNameSync(String addressName) {
    return getByIndexSync(r'addressName', [addressName]);
  }

  Future<bool> deleteByAddressName(String addressName) {
    return deleteByIndex(r'addressName', [addressName]);
  }

  bool deleteByAddressNameSync(String addressName) {
    return deleteByIndexSync(r'addressName', [addressName]);
  }

  Future<List<SignalIdentity?>> getAllByAddressName(
      List<String> addressNameValues) {
    final values = addressNameValues.map((e) => [e]).toList();
    return getAllByIndex(r'addressName', values);
  }

  List<SignalIdentity?> getAllByAddressNameSync(
      List<String> addressNameValues) {
    final values = addressNameValues.map((e) => [e]).toList();
    return getAllByIndexSync(r'addressName', values);
  }

  Future<int> deleteAllByAddressName(List<String> addressNameValues) {
    final values = addressNameValues.map((e) => [e]).toList();
    return deleteAllByIndex(r'addressName', values);
  }

  int deleteAllByAddressNameSync(List<String> addressNameValues) {
    final values = addressNameValues.map((e) => [e]).toList();
    return deleteAllByIndexSync(r'addressName', values);
  }

  Future<Id> putByAddressName(SignalIdentity object) {
    return putByIndex(r'addressName', object);
  }

  Id putByAddressNameSync(SignalIdentity object, {bool saveLinks = true}) {
    return putByIndexSync(r'addressName', object, saveLinks: saveLinks);
  }

  Future<List<Id>> putAllByAddressName(List<SignalIdentity> objects) {
    return putAllByIndex(r'addressName', objects);
  }

  List<Id> putAllByAddressNameSync(List<SignalIdentity> objects,
      {bool saveLinks = true}) {
    return putAllByIndexSync(r'addressName', objects, saveLinks: saveLinks);
  }
}

extension SignalIdentityQueryWhereSort
    on QueryBuilder<SignalIdentity, SignalIdentity, QWhere> {
  QueryBuilder<SignalIdentity, SignalIdentity, QAfterWhere> anyId() {
    return QueryBuilder.apply(this, (query) {
      return query.addWhereClause(const IdWhereClause.any());
    });
  }
}

extension SignalIdentityQueryWhere
    on QueryBuilder<SignalIdentity, SignalIdentity, QWhereClause> {
  QueryBuilder<SignalIdentity, SignalIdentity, QAfterWhereClause> idEqualTo(
      Id id) {
    return QueryBuilder.apply(this, (query) {
      return query.addWhereClause(IdWhereClause.between(
        lower: id,
        upper: id,
      ));
    });
  }

  QueryBuilder<SignalIdentity, SignalIdentity, QAfterWhereClause> idNotEqualTo(
      Id id) {
    return QueryBuilder.apply(this, (query) {
      if (query.whereSort == Sort.asc) {
        return query
            .addWhereClause(
              IdWhereClause.lessThan(upper: id, includeUpper: false),
            )
            .addWhereClause(
              IdWhereClause.greaterThan(lower: id, includeLower: false),
            );
      } else {
        return query
            .addWhereClause(
              IdWhereClause.greaterThan(lower: id, includeLower: false),
            )
            .addWhereClause(
              IdWhereClause.lessThan(upper: id, includeUpper: false),
            );
      }
    });
  }

  QueryBuilder<SignalIdentity, SignalIdentity, QAfterWhereClause> idGreaterThan(
      Id id,
      {bool include = false}) {
    return QueryBuilder.apply(this, (query) {
      return query.addWhereClause(
        IdWhereClause.greaterThan(lower: id, includeLower: include),
      );
    });
  }

  QueryBuilder<SignalIdentity, SignalIdentity, QAfterWhereClause> idLessThan(
      Id id,
      {bool include = false}) {
    return QueryBuilder.apply(this, (query) {
      return query.addWhereClause(
        IdWhereClause.lessThan(upper: id, includeUpper: include),
      );
    });
  }

  QueryBuilder<SignalIdentity, SignalIdentity, QAfterWhereClause> idBetween(
    Id lowerId,
    Id upperId, {
    bool includeLower = true,
    bool includeUpper = true,
  }) {
    return QueryBuilder.apply(this, (query) {
      return query.addWhereClause(IdWhereClause.between(
        lower: lowerId,
        includeLower: includeLower,
        upper: upperId,
        includeUpper: includeUpper,
      ));
    });
  }

  QueryBuilder<SignalIdentity, SignalIdentity, QAfterWhereClause>
      addressNameEqualTo(String addressName) {
    return QueryBuilder.apply(this, (query) {
      return query.addWhereClause(IndexWhereClause.equalTo(
        indexName: r'addressName',
        value: [addressName],
      ));
    });
  }

  QueryBuilder<SignalIdentity, SignalIdentity, QAfterWhereClause>
      addressNameNotEqualTo(String addressName) {
    return QueryBuilder.apply(this, (query) {
      if (query.whereSort == Sort.asc) {
        return query
            .addWhereClause(IndexWhereClause.between(
              indexName: r'addressName',
              lower: [],
              upper: [addressName],
              includeUpper: false,
            ))
            .addWhereClause(IndexWhereClause.between(
              indexName: r'addressName',
              lower: [addressName],
              includeLower: false,
              upper: [],
            ));
      } else {
        return query
            .addWhereClause(IndexWhereClause.between(
              indexName: r'addressName',
              lower: [addressName],
              includeLower: false,
              upper: [],
            ))
            .addWhereClause(IndexWhereClause.between(
              indexName: r'addressName',
              lower: [],
              upper: [addressName],
              includeUpper: false,
            ));
      }
    });
  }
}

extension SignalIdentityQueryFilter
    on QueryBuilder<SignalIdentity, SignalIdentity, QFilterCondition> {
  QueryBuilder<SignalIdentity, SignalIdentity, QAfterFilterCondition>
      addressNameEqualTo(
    String value, {
    bool caseSensitive = true,
  }) {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(FilterCondition.equalTo(
        property: r'addressName',
        value: value,
        caseSensitive: caseSensitive,
      ));
    });
  }

  QueryBuilder<SignalIdentity, SignalIdentity, QAfterFilterCondition>
      addressNameGreaterThan(
    String value, {
    bool include = false,
    bool caseSensitive = true,
  }) {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(FilterCondition.greaterThan(
        include: include,
        property: r'addressName',
        value: value,
        caseSensitive: caseSensitive,
      ));
    });
  }

  QueryBuilder<SignalIdentity, SignalIdentity, QAfterFilterCondition>
      addressNameLessThan(
    String value, {
    bool include = false,
    bool caseSensitive = true,
  }) {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(FilterCondition.lessThan(
        include: include,
        property: r'addressName',
        value: value,
        caseSensitive: caseSensitive,
      ));
    });
  }

  QueryBuilder<SignalIdentity, SignalIdentity, QAfterFilterCondition>
      addressNameBetween(
    String lower,
    String upper, {
    bool includeLower = true,
    bool includeUpper = true,
    bool caseSensitive = true,
  }) {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(FilterCondition.between(
        property: r'addressName',
        lower: lower,
        includeLower: includeLower,
        upper: upper,
        includeUpper: includeUpper,
        caseSensitive: caseSensitive,
      ));
    });
  }

  QueryBuilder<SignalIdentity, SignalIdentity, QAfterFilterCondition>
      addressNameStartsWith(
    String value, {
    bool caseSensitive = true,
  }) {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(FilterCondition.startsWith(
        property: r'addressName',
        value: value,
        caseSensitive: caseSensitive,
      ));
    });
  }

  QueryBuilder<SignalIdentity, SignalIdentity, QAfterFilterCondition>
      addressNameEndsWith(
    String value, {
    bool caseSensitive = true,
  }) {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(FilterCondition.endsWith(
        property: r'addressName',
        value: value,
        caseSensitive: caseSensitive,
      ));
    });
  }

  QueryBuilder<SignalIdentity, SignalIdentity, QAfterFilterCondition>
      addressNameContains(String value, {bool caseSensitive = true}) {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(FilterCondition.contains(
        property: r'addressName',
        value: value,
        caseSensitive: caseSensitive,
      ));
    });
  }

  QueryBuilder<SignalIdentity, SignalIdentity, QAfterFilterCondition>
      addressNameMatches(String pattern, {bool caseSensitive = true}) {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(FilterCondition.matches(
        property: r'addressName',
        wildcard: pattern,
        caseSensitive: caseSensitive,
      ));
    });
  }

  QueryBuilder<SignalIdentity, SignalIdentity, QAfterFilterCondition>
      addressNameIsEmpty() {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(FilterCondition.equalTo(
        property: r'addressName',
        value: '',
      ));
    });
  }

  QueryBuilder<SignalIdentity, SignalIdentity, QAfterFilterCondition>
      addressNameIsNotEmpty() {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(FilterCondition.greaterThan(
        property: r'addressName',
        value: '',
      ));
    });
  }

  QueryBuilder<SignalIdentity, SignalIdentity, QAfterFilterCondition> idEqualTo(
      Id value) {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(FilterCondition.equalTo(
        property: r'id',
        value: value,
      ));
    });
  }

  QueryBuilder<SignalIdentity, SignalIdentity, QAfterFilterCondition>
      idGreaterThan(
    Id value, {
    bool include = false,
  }) {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(FilterCondition.greaterThan(
        include: include,
        property: r'id',
        value: value,
      ));
    });
  }

  QueryBuilder<SignalIdentity, SignalIdentity, QAfterFilterCondition>
      idLessThan(
    Id value, {
    bool include = false,
  }) {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(FilterCondition.lessThan(
        include: include,
        property: r'id',
        value: value,
      ));
    });
  }

  QueryBuilder<SignalIdentity, SignalIdentity, QAfterFilterCondition> idBetween(
    Id lower,
    Id upper, {
    bool includeLower = true,
    bool includeUpper = true,
  }) {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(FilterCondition.between(
        property: r'id',
        lower: lower,
        includeLower: includeLower,
        upper: upper,
        includeUpper: includeUpper,
      ));
    });
  }

  QueryBuilder<SignalIdentity, SignalIdentity, QAfterFilterCondition>
      identityKeyElementEqualTo(int value) {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(FilterCondition.equalTo(
        property: r'identityKey',
        value: value,
      ));
    });
  }

  QueryBuilder<SignalIdentity, SignalIdentity, QAfterFilterCondition>
      identityKeyElementGreaterThan(
    int value, {
    bool include = false,
  }) {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(FilterCondition.greaterThan(
        include: include,
        property: r'identityKey',
        value: value,
      ));
    });
  }

  QueryBuilder<SignalIdentity, SignalIdentity, QAfterFilterCondition>
      identityKeyElementLessThan(
    int value, {
    bool include = false,
  }) {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(FilterCondition.lessThan(
        include: include,
        property: r'identityKey',
        value: value,
      ));
    });
  }

  QueryBuilder<SignalIdentity, SignalIdentity, QAfterFilterCondition>
      identityKeyElementBetween(
    int lower,
    int upper, {
    bool includeLower = true,
    bool includeUpper = true,
  }) {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(FilterCondition.between(
        property: r'identityKey',
        lower: lower,
        includeLower: includeLower,
        upper: upper,
        includeUpper: includeUpper,
      ));
    });
  }

  QueryBuilder<SignalIdentity, SignalIdentity, QAfterFilterCondition>
      identityKeyLengthEqualTo(int length) {
    return QueryBuilder.apply(this, (query) {
      return query.listLength(
        r'identityKey',
        length,
        true,
        length,
        true,
      );
    });
  }

  QueryBuilder<SignalIdentity, SignalIdentity, QAfterFilterCondition>
      identityKeyIsEmpty() {
    return QueryBuilder.apply(this, (query) {
      return query.listLength(
        r'identityKey',
        0,
        true,
        0,
        true,
      );
    });
  }

  QueryBuilder<SignalIdentity, SignalIdentity, QAfterFilterCondition>
      identityKeyIsNotEmpty() {
    return QueryBuilder.apply(this, (query) {
      return query.listLength(
        r'identityKey',
        0,
        false,
        999999,
        true,
      );
    });
  }

  QueryBuilder<SignalIdentity, SignalIdentity, QAfterFilterCondition>
      identityKeyLengthLessThan(
    int length, {
    bool include = false,
  }) {
    return QueryBuilder.apply(this, (query) {
      return query.listLength(
        r'identityKey',
        0,
        true,
        length,
        include,
      );
    });
  }

  QueryBuilder<SignalIdentity, SignalIdentity, QAfterFilterCondition>
      identityKeyLengthGreaterThan(
    int length, {
    bool include = false,
  }) {
    return QueryBuilder.apply(this, (query) {
      return query.listLength(
        r'identityKey',
        length,
        include,
        999999,
        true,
      );
    });
  }

  QueryBuilder<SignalIdentity, SignalIdentity, QAfterFilterCondition>
      identityKeyLengthBetween(
    int lower,
    int upper, {
    bool includeLower = true,
    bool includeUpper = true,
  }) {
    return QueryBuilder.apply(this, (query) {
      return query.listLength(
        r'identityKey',
        lower,
        includeLower,
        upper,
        includeUpper,
      );
    });
  }
}

extension SignalIdentityQueryObject
    on QueryBuilder<SignalIdentity, SignalIdentity, QFilterCondition> {}

extension SignalIdentityQueryLinks
    on QueryBuilder<SignalIdentity, SignalIdentity, QFilterCondition> {}

extension SignalIdentityQuerySortBy
    on QueryBuilder<SignalIdentity, SignalIdentity, QSortBy> {
  QueryBuilder<SignalIdentity, SignalIdentity, QAfterSortBy>
      sortByAddressName() {
    return QueryBuilder.apply(this, (query) {
      return query.addSortBy(r'addressName', Sort.asc);
    });
  }

  QueryBuilder<SignalIdentity, SignalIdentity, QAfterSortBy>
      sortByAddressNameDesc() {
    return QueryBuilder.apply(this, (query) {
      return query.addSortBy(r'addressName', Sort.desc);
    });
  }
}

extension SignalIdentityQuerySortThenBy
    on QueryBuilder<SignalIdentity, SignalIdentity, QSortThenBy> {
  QueryBuilder<SignalIdentity, SignalIdentity, QAfterSortBy>
      thenByAddressName() {
    return QueryBuilder.apply(this, (query) {
      return query.addSortBy(r'addressName', Sort.asc);
    });
  }

  QueryBuilder<SignalIdentity, SignalIdentity, QAfterSortBy>
      thenByAddressNameDesc() {
    return QueryBuilder.apply(this, (query) {
      return query.addSortBy(r'addressName', Sort.desc);
    });
  }

  QueryBuilder<SignalIdentity, SignalIdentity, QAfterSortBy> thenById() {
    return QueryBuilder.apply(this, (query) {
      return query.addSortBy(r'id', Sort.asc);
    });
  }

  QueryBuilder<SignalIdentity, SignalIdentity, QAfterSortBy> thenByIdDesc() {
    return QueryBuilder.apply(this, (query) {
      return query.addSortBy(r'id', Sort.desc);
    });
  }
}

extension SignalIdentityQueryWhereDistinct
    on QueryBuilder<SignalIdentity, SignalIdentity, QDistinct> {
  QueryBuilder<SignalIdentity, SignalIdentity, QDistinct> distinctByAddressName(
      {bool caseSensitive = true}) {
    return QueryBuilder.apply(this, (query) {
      return query.addDistinctBy(r'addressName', caseSensitive: caseSensitive);
    });
  }

  QueryBuilder<SignalIdentity, SignalIdentity, QDistinct>
      distinctByIdentityKey() {
    return QueryBuilder.apply(this, (query) {
      return query.addDistinctBy(r'identityKey');
    });
  }
}

extension SignalIdentityQueryProperty
    on QueryBuilder<SignalIdentity, SignalIdentity, QQueryProperty> {
  QueryBuilder<SignalIdentity, int, QQueryOperations> idProperty() {
    return QueryBuilder.apply(this, (query) {
      return query.addPropertyName(r'id');
    });
  }

  QueryBuilder<SignalIdentity, String, QQueryOperations> addressNameProperty() {
    return QueryBuilder.apply(this, (query) {
      return query.addPropertyName(r'addressName');
    });
  }

  QueryBuilder<SignalIdentity, List<int>, QQueryOperations>
      identityKeyProperty() {
    return QueryBuilder.apply(this, (query) {
      return query.addPropertyName(r'identityKey');
    });
  }
}

// coverage:ignore-file
// ignore_for_file: duplicate_ignore, non_constant_identifier_names, constant_identifier_names, invalid_use_of_protected_member, unnecessary_cast, prefer_const_constructors, lines_longer_than_80_chars, require_trailing_commas, inference_failure_on_function_invocation, unnecessary_parenthesis, unnecessary_raw_strings, unnecessary_null_checks, join_return_with_assignment, prefer_final_locals, avoid_js_rounded_ints, avoid_positional_boolean_parameters, always_specify_types

extension GetLocalSignalIdentityCollection on Isar {
  IsarCollection<LocalSignalIdentity> get localSignalIdentitys =>
      this.collection();
}

const LocalSignalIdentitySchema = CollectionSchema(
  name: r'LocalSignalIdentity',
  id: 8482381558882252796,
  properties: {
    r'identityKeyPair': PropertySchema(
      id: 0,
      name: r'identityKeyPair',
      type: IsarType.longList,
    ),
    r'registrationId': PropertySchema(
      id: 1,
      name: r'registrationId',
      type: IsarType.long,
    )
  },
  estimateSize: _localSignalIdentityEstimateSize,
  serialize: _localSignalIdentitySerialize,
  deserialize: _localSignalIdentityDeserialize,
  deserializeProp: _localSignalIdentityDeserializeProp,
  idName: r'id',
  indexes: {},
  links: {},
  embeddedSchemas: {},
  getId: _localSignalIdentityGetId,
  getLinks: _localSignalIdentityGetLinks,
  attach: _localSignalIdentityAttach,
  version: '3.1.0+1',
);

int _localSignalIdentityEstimateSize(
  LocalSignalIdentity object,
  List<int> offsets,
  Map<Type, List<int>> allOffsets,
) {
  var bytesCount = offsets.last;
  bytesCount += 3 + object.identityKeyPair.length * 8;
  return bytesCount;
}

void _localSignalIdentitySerialize(
  LocalSignalIdentity object,
  IsarWriter writer,
  List<int> offsets,
  Map<Type, List<int>> allOffsets,
) {
  writer.writeLongList(offsets[0], object.identityKeyPair);
  writer.writeLong(offsets[1], object.registrationId);
}

LocalSignalIdentity _localSignalIdentityDeserialize(
  Id id,
  IsarReader reader,
  List<int> offsets,
  Map<Type, List<int>> allOffsets,
) {
  final object = LocalSignalIdentity();
  object.id = id;
  object.identityKeyPair = reader.readLongList(offsets[0]) ?? [];
  object.registrationId = reader.readLong(offsets[1]);
  return object;
}

P _localSignalIdentityDeserializeProp<P>(
  IsarReader reader,
  int propertyId,
  int offset,
  Map<Type, List<int>> allOffsets,
) {
  switch (propertyId) {
    case 0:
      return (reader.readLongList(offset) ?? []) as P;
    case 1:
      return (reader.readLong(offset)) as P;
    default:
      throw IsarError('Unknown property with id $propertyId');
  }
}

Id _localSignalIdentityGetId(LocalSignalIdentity object) {
  return object.id;
}

List<IsarLinkBase<dynamic>> _localSignalIdentityGetLinks(
    LocalSignalIdentity object) {
  return [];
}

void _localSignalIdentityAttach(
    IsarCollection<dynamic> col, Id id, LocalSignalIdentity object) {
  object.id = id;
}

extension LocalSignalIdentityQueryWhereSort
    on QueryBuilder<LocalSignalIdentity, LocalSignalIdentity, QWhere> {
  QueryBuilder<LocalSignalIdentity, LocalSignalIdentity, QAfterWhere> anyId() {
    return QueryBuilder.apply(this, (query) {
      return query.addWhereClause(const IdWhereClause.any());
    });
  }
}

extension LocalSignalIdentityQueryWhere
    on QueryBuilder<LocalSignalIdentity, LocalSignalIdentity, QWhereClause> {
  QueryBuilder<LocalSignalIdentity, LocalSignalIdentity, QAfterWhereClause>
      idEqualTo(Id id) {
    return QueryBuilder.apply(this, (query) {
      return query.addWhereClause(IdWhereClause.between(
        lower: id,
        upper: id,
      ));
    });
  }

  QueryBuilder<LocalSignalIdentity, LocalSignalIdentity, QAfterWhereClause>
      idNotEqualTo(Id id) {
    return QueryBuilder.apply(this, (query) {
      if (query.whereSort == Sort.asc) {
        return query
            .addWhereClause(
              IdWhereClause.lessThan(upper: id, includeUpper: false),
            )
            .addWhereClause(
              IdWhereClause.greaterThan(lower: id, includeLower: false),
            );
      } else {
        return query
            .addWhereClause(
              IdWhereClause.greaterThan(lower: id, includeLower: false),
            )
            .addWhereClause(
              IdWhereClause.lessThan(upper: id, includeUpper: false),
            );
      }
    });
  }

  QueryBuilder<LocalSignalIdentity, LocalSignalIdentity, QAfterWhereClause>
      idGreaterThan(Id id, {bool include = false}) {
    return QueryBuilder.apply(this, (query) {
      return query.addWhereClause(
        IdWhereClause.greaterThan(lower: id, includeLower: include),
      );
    });
  }

  QueryBuilder<LocalSignalIdentity, LocalSignalIdentity, QAfterWhereClause>
      idLessThan(Id id, {bool include = false}) {
    return QueryBuilder.apply(this, (query) {
      return query.addWhereClause(
        IdWhereClause.lessThan(upper: id, includeUpper: include),
      );
    });
  }

  QueryBuilder<LocalSignalIdentity, LocalSignalIdentity, QAfterWhereClause>
      idBetween(
    Id lowerId,
    Id upperId, {
    bool includeLower = true,
    bool includeUpper = true,
  }) {
    return QueryBuilder.apply(this, (query) {
      return query.addWhereClause(IdWhereClause.between(
        lower: lowerId,
        includeLower: includeLower,
        upper: upperId,
        includeUpper: includeUpper,
      ));
    });
  }
}

extension LocalSignalIdentityQueryFilter on QueryBuilder<LocalSignalIdentity,
    LocalSignalIdentity, QFilterCondition> {
  QueryBuilder<LocalSignalIdentity, LocalSignalIdentity, QAfterFilterCondition>
      idEqualTo(Id value) {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(FilterCondition.equalTo(
        property: r'id',
        value: value,
      ));
    });
  }

  QueryBuilder<LocalSignalIdentity, LocalSignalIdentity, QAfterFilterCondition>
      idGreaterThan(
    Id value, {
    bool include = false,
  }) {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(FilterCondition.greaterThan(
        include: include,
        property: r'id',
        value: value,
      ));
    });
  }

  QueryBuilder<LocalSignalIdentity, LocalSignalIdentity, QAfterFilterCondition>
      idLessThan(
    Id value, {
    bool include = false,
  }) {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(FilterCondition.lessThan(
        include: include,
        property: r'id',
        value: value,
      ));
    });
  }

  QueryBuilder<LocalSignalIdentity, LocalSignalIdentity, QAfterFilterCondition>
      idBetween(
    Id lower,
    Id upper, {
    bool includeLower = true,
    bool includeUpper = true,
  }) {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(FilterCondition.between(
        property: r'id',
        lower: lower,
        includeLower: includeLower,
        upper: upper,
        includeUpper: includeUpper,
      ));
    });
  }

  QueryBuilder<LocalSignalIdentity, LocalSignalIdentity, QAfterFilterCondition>
      identityKeyPairElementEqualTo(int value) {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(FilterCondition.equalTo(
        property: r'identityKeyPair',
        value: value,
      ));
    });
  }

  QueryBuilder<LocalSignalIdentity, LocalSignalIdentity, QAfterFilterCondition>
      identityKeyPairElementGreaterThan(
    int value, {
    bool include = false,
  }) {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(FilterCondition.greaterThan(
        include: include,
        property: r'identityKeyPair',
        value: value,
      ));
    });
  }

  QueryBuilder<LocalSignalIdentity, LocalSignalIdentity, QAfterFilterCondition>
      identityKeyPairElementLessThan(
    int value, {
    bool include = false,
  }) {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(FilterCondition.lessThan(
        include: include,
        property: r'identityKeyPair',
        value: value,
      ));
    });
  }

  QueryBuilder<LocalSignalIdentity, LocalSignalIdentity, QAfterFilterCondition>
      identityKeyPairElementBetween(
    int lower,
    int upper, {
    bool includeLower = true,
    bool includeUpper = true,
  }) {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(FilterCondition.between(
        property: r'identityKeyPair',
        lower: lower,
        includeLower: includeLower,
        upper: upper,
        includeUpper: includeUpper,
      ));
    });
  }

  QueryBuilder<LocalSignalIdentity, LocalSignalIdentity, QAfterFilterCondition>
      identityKeyPairLengthEqualTo(int length) {
    return QueryBuilder.apply(this, (query) {
      return query.listLength(
        r'identityKeyPair',
        length,
        true,
        length,
        true,
      );
    });
  }

  QueryBuilder<LocalSignalIdentity, LocalSignalIdentity, QAfterFilterCondition>
      identityKeyPairIsEmpty() {
    return QueryBuilder.apply(this, (query) {
      return query.listLength(
        r'identityKeyPair',
        0,
        true,
        0,
        true,
      );
    });
  }

  QueryBuilder<LocalSignalIdentity, LocalSignalIdentity, QAfterFilterCondition>
      identityKeyPairIsNotEmpty() {
    return QueryBuilder.apply(this, (query) {
      return query.listLength(
        r'identityKeyPair',
        0,
        false,
        999999,
        true,
      );
    });
  }

  QueryBuilder<LocalSignalIdentity, LocalSignalIdentity, QAfterFilterCondition>
      identityKeyPairLengthLessThan(
    int length, {
    bool include = false,
  }) {
    return QueryBuilder.apply(this, (query) {
      return query.listLength(
        r'identityKeyPair',
        0,
        true,
        length,
        include,
      );
    });
  }

  QueryBuilder<LocalSignalIdentity, LocalSignalIdentity, QAfterFilterCondition>
      identityKeyPairLengthGreaterThan(
    int length, {
    bool include = false,
  }) {
    return QueryBuilder.apply(this, (query) {
      return query.listLength(
        r'identityKeyPair',
        length,
        include,
        999999,
        true,
      );
    });
  }

  QueryBuilder<LocalSignalIdentity, LocalSignalIdentity, QAfterFilterCondition>
      identityKeyPairLengthBetween(
    int lower,
    int upper, {
    bool includeLower = true,
    bool includeUpper = true,
  }) {
    return QueryBuilder.apply(this, (query) {
      return query.listLength(
        r'identityKeyPair',
        lower,
        includeLower,
        upper,
        includeUpper,
      );
    });
  }

  QueryBuilder<LocalSignalIdentity, LocalSignalIdentity, QAfterFilterCondition>
      registrationIdEqualTo(int value) {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(FilterCondition.equalTo(
        property: r'registrationId',
        value: value,
      ));
    });
  }

  QueryBuilder<LocalSignalIdentity, LocalSignalIdentity, QAfterFilterCondition>
      registrationIdGreaterThan(
    int value, {
    bool include = false,
  }) {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(FilterCondition.greaterThan(
        include: include,
        property: r'registrationId',
        value: value,
      ));
    });
  }

  QueryBuilder<LocalSignalIdentity, LocalSignalIdentity, QAfterFilterCondition>
      registrationIdLessThan(
    int value, {
    bool include = false,
  }) {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(FilterCondition.lessThan(
        include: include,
        property: r'registrationId',
        value: value,
      ));
    });
  }

  QueryBuilder<LocalSignalIdentity, LocalSignalIdentity, QAfterFilterCondition>
      registrationIdBetween(
    int lower,
    int upper, {
    bool includeLower = true,
    bool includeUpper = true,
  }) {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(FilterCondition.between(
        property: r'registrationId',
        lower: lower,
        includeLower: includeLower,
        upper: upper,
        includeUpper: includeUpper,
      ));
    });
  }
}

extension LocalSignalIdentityQueryObject on QueryBuilder<LocalSignalIdentity,
    LocalSignalIdentity, QFilterCondition> {}

extension LocalSignalIdentityQueryLinks on QueryBuilder<LocalSignalIdentity,
    LocalSignalIdentity, QFilterCondition> {}

extension LocalSignalIdentityQuerySortBy
    on QueryBuilder<LocalSignalIdentity, LocalSignalIdentity, QSortBy> {
  QueryBuilder<LocalSignalIdentity, LocalSignalIdentity, QAfterSortBy>
      sortByRegistrationId() {
    return QueryBuilder.apply(this, (query) {
      return query.addSortBy(r'registrationId', Sort.asc);
    });
  }

  QueryBuilder<LocalSignalIdentity, LocalSignalIdentity, QAfterSortBy>
      sortByRegistrationIdDesc() {
    return QueryBuilder.apply(this, (query) {
      return query.addSortBy(r'registrationId', Sort.desc);
    });
  }
}

extension LocalSignalIdentityQuerySortThenBy
    on QueryBuilder<LocalSignalIdentity, LocalSignalIdentity, QSortThenBy> {
  QueryBuilder<LocalSignalIdentity, LocalSignalIdentity, QAfterSortBy>
      thenById() {
    return QueryBuilder.apply(this, (query) {
      return query.addSortBy(r'id', Sort.asc);
    });
  }

  QueryBuilder<LocalSignalIdentity, LocalSignalIdentity, QAfterSortBy>
      thenByIdDesc() {
    return QueryBuilder.apply(this, (query) {
      return query.addSortBy(r'id', Sort.desc);
    });
  }

  QueryBuilder<LocalSignalIdentity, LocalSignalIdentity, QAfterSortBy>
      thenByRegistrationId() {
    return QueryBuilder.apply(this, (query) {
      return query.addSortBy(r'registrationId', Sort.asc);
    });
  }

  QueryBuilder<LocalSignalIdentity, LocalSignalIdentity, QAfterSortBy>
      thenByRegistrationIdDesc() {
    return QueryBuilder.apply(this, (query) {
      return query.addSortBy(r'registrationId', Sort.desc);
    });
  }
}

extension LocalSignalIdentityQueryWhereDistinct
    on QueryBuilder<LocalSignalIdentity, LocalSignalIdentity, QDistinct> {
  QueryBuilder<LocalSignalIdentity, LocalSignalIdentity, QDistinct>
      distinctByIdentityKeyPair() {
    return QueryBuilder.apply(this, (query) {
      return query.addDistinctBy(r'identityKeyPair');
    });
  }

  QueryBuilder<LocalSignalIdentity, LocalSignalIdentity, QDistinct>
      distinctByRegistrationId() {
    return QueryBuilder.apply(this, (query) {
      return query.addDistinctBy(r'registrationId');
    });
  }
}

extension LocalSignalIdentityQueryProperty
    on QueryBuilder<LocalSignalIdentity, LocalSignalIdentity, QQueryProperty> {
  QueryBuilder<LocalSignalIdentity, int, QQueryOperations> idProperty() {
    return QueryBuilder.apply(this, (query) {
      return query.addPropertyName(r'id');
    });
  }

  QueryBuilder<LocalSignalIdentity, List<int>, QQueryOperations>
      identityKeyPairProperty() {
    return QueryBuilder.apply(this, (query) {
      return query.addPropertyName(r'identityKeyPair');
    });
  }

  QueryBuilder<LocalSignalIdentity, int, QQueryOperations>
      registrationIdProperty() {
    return QueryBuilder.apply(this, (query) {
      return query.addPropertyName(r'registrationId');
    });
  }
}
