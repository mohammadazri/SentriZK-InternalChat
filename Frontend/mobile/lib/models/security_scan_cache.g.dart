// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'security_scan_cache.dart';

// **************************************************************************
// IsarCollectionGenerator
// **************************************************************************

// coverage:ignore-file
// ignore_for_file: duplicate_ignore, non_constant_identifier_names, constant_identifier_names, invalid_use_of_protected_member, unnecessary_cast, prefer_const_constructors, lines_longer_than_80_chars, require_trailing_commas, inference_failure_on_function_invocation, unnecessary_parenthesis, unnecessary_raw_strings, unnecessary_null_checks, join_return_with_assignment, prefer_final_locals, avoid_js_rounded_ints, avoid_positional_boolean_parameters, always_specify_types

extension GetSecurityScanCacheCollection on Isar {
  IsarCollection<SecurityScanCache> get securityScanCaches => this.collection();
}

const SecurityScanCacheSchema = CollectionSchema(
  name: r'SecurityScanCache',
  id: 1394169654802126148,
  properties: {
    r'contentHash': PropertySchema(
      id: 0,
      name: r'contentHash',
      type: IsarType.string,
    ),
    r'expiresAt': PropertySchema(
      id: 1,
      name: r'expiresAt',
      type: IsarType.dateTime,
    ),
    r'hasDangerousUrls': PropertySchema(
      id: 2,
      name: r'hasDangerousUrls',
      type: IsarType.bool,
    ),
    r'hasSuspiciousUrls': PropertySchema(
      id: 3,
      name: r'hasSuspiciousUrls',
      type: IsarType.bool,
    ),
    r'isSafe': PropertySchema(
      id: 4,
      name: r'isSafe',
      type: IsarType.bool,
    ),
    r'scanDate': PropertySchema(
      id: 5,
      name: r'scanDate',
      type: IsarType.dateTime,
    ),
    r'threatLevel': PropertySchema(
      id: 6,
      name: r'threatLevel',
      type: IsarType.long,
    ),
    r'urls': PropertySchema(
      id: 7,
      name: r'urls',
      type: IsarType.string,
    ),
    r'warnings': PropertySchema(
      id: 8,
      name: r'warnings',
      type: IsarType.string,
    )
  },
  estimateSize: _securityScanCacheEstimateSize,
  serialize: _securityScanCacheSerialize,
  deserialize: _securityScanCacheDeserialize,
  deserializeProp: _securityScanCacheDeserializeProp,
  idName: r'id',
  indexes: {
    r'contentHash': IndexSchema(
      id: -8004451629925743238,
      name: r'contentHash',
      unique: true,
      replace: false,
      properties: [
        IndexPropertySchema(
          name: r'contentHash',
          type: IndexType.hash,
          caseSensitive: true,
        )
      ],
    )
  },
  links: {},
  embeddedSchemas: {},
  getId: _securityScanCacheGetId,
  getLinks: _securityScanCacheGetLinks,
  attach: _securityScanCacheAttach,
  version: '3.1.0+1',
);

int _securityScanCacheEstimateSize(
  SecurityScanCache object,
  List<int> offsets,
  Map<Type, List<int>> allOffsets,
) {
  var bytesCount = offsets.last;
  bytesCount += 3 + object.contentHash.length * 3;
  bytesCount += 3 + object.urls.length * 3;
  {
    final value = object.warnings;
    if (value != null) {
      bytesCount += 3 + value.length * 3;
    }
  }
  return bytesCount;
}

void _securityScanCacheSerialize(
  SecurityScanCache object,
  IsarWriter writer,
  List<int> offsets,
  Map<Type, List<int>> allOffsets,
) {
  writer.writeString(offsets[0], object.contentHash);
  writer.writeDateTime(offsets[1], object.expiresAt);
  writer.writeBool(offsets[2], object.hasDangerousUrls);
  writer.writeBool(offsets[3], object.hasSuspiciousUrls);
  writer.writeBool(offsets[4], object.isSafe);
  writer.writeDateTime(offsets[5], object.scanDate);
  writer.writeLong(offsets[6], object.threatLevel);
  writer.writeString(offsets[7], object.urls);
  writer.writeString(offsets[8], object.warnings);
}

SecurityScanCache _securityScanCacheDeserialize(
  Id id,
  IsarReader reader,
  List<int> offsets,
  Map<Type, List<int>> allOffsets,
) {
  final object = SecurityScanCache();
  object.contentHash = reader.readString(offsets[0]);
  object.expiresAt = reader.readDateTime(offsets[1]);
  object.hasDangerousUrls = reader.readBool(offsets[2]);
  object.hasSuspiciousUrls = reader.readBool(offsets[3]);
  object.id = id;
  object.isSafe = reader.readBool(offsets[4]);
  object.scanDate = reader.readDateTime(offsets[5]);
  object.threatLevel = reader.readLong(offsets[6]);
  object.urls = reader.readString(offsets[7]);
  object.warnings = reader.readStringOrNull(offsets[8]);
  return object;
}

P _securityScanCacheDeserializeProp<P>(
  IsarReader reader,
  int propertyId,
  int offset,
  Map<Type, List<int>> allOffsets,
) {
  switch (propertyId) {
    case 0:
      return (reader.readString(offset)) as P;
    case 1:
      return (reader.readDateTime(offset)) as P;
    case 2:
      return (reader.readBool(offset)) as P;
    case 3:
      return (reader.readBool(offset)) as P;
    case 4:
      return (reader.readBool(offset)) as P;
    case 5:
      return (reader.readDateTime(offset)) as P;
    case 6:
      return (reader.readLong(offset)) as P;
    case 7:
      return (reader.readString(offset)) as P;
    case 8:
      return (reader.readStringOrNull(offset)) as P;
    default:
      throw IsarError('Unknown property with id $propertyId');
  }
}

Id _securityScanCacheGetId(SecurityScanCache object) {
  return object.id;
}

List<IsarLinkBase<dynamic>> _securityScanCacheGetLinks(
    SecurityScanCache object) {
  return [];
}

void _securityScanCacheAttach(
    IsarCollection<dynamic> col, Id id, SecurityScanCache object) {
  object.id = id;
}

extension SecurityScanCacheByIndex on IsarCollection<SecurityScanCache> {
  Future<SecurityScanCache?> getByContentHash(String contentHash) {
    return getByIndex(r'contentHash', [contentHash]);
  }

  SecurityScanCache? getByContentHashSync(String contentHash) {
    return getByIndexSync(r'contentHash', [contentHash]);
  }

  Future<bool> deleteByContentHash(String contentHash) {
    return deleteByIndex(r'contentHash', [contentHash]);
  }

  bool deleteByContentHashSync(String contentHash) {
    return deleteByIndexSync(r'contentHash', [contentHash]);
  }

  Future<List<SecurityScanCache?>> getAllByContentHash(
      List<String> contentHashValues) {
    final values = contentHashValues.map((e) => [e]).toList();
    return getAllByIndex(r'contentHash', values);
  }

  List<SecurityScanCache?> getAllByContentHashSync(
      List<String> contentHashValues) {
    final values = contentHashValues.map((e) => [e]).toList();
    return getAllByIndexSync(r'contentHash', values);
  }

  Future<int> deleteAllByContentHash(List<String> contentHashValues) {
    final values = contentHashValues.map((e) => [e]).toList();
    return deleteAllByIndex(r'contentHash', values);
  }

  int deleteAllByContentHashSync(List<String> contentHashValues) {
    final values = contentHashValues.map((e) => [e]).toList();
    return deleteAllByIndexSync(r'contentHash', values);
  }

  Future<Id> putByContentHash(SecurityScanCache object) {
    return putByIndex(r'contentHash', object);
  }

  Id putByContentHashSync(SecurityScanCache object, {bool saveLinks = true}) {
    return putByIndexSync(r'contentHash', object, saveLinks: saveLinks);
  }

  Future<List<Id>> putAllByContentHash(List<SecurityScanCache> objects) {
    return putAllByIndex(r'contentHash', objects);
  }

  List<Id> putAllByContentHashSync(List<SecurityScanCache> objects,
      {bool saveLinks = true}) {
    return putAllByIndexSync(r'contentHash', objects, saveLinks: saveLinks);
  }
}

extension SecurityScanCacheQueryWhereSort
    on QueryBuilder<SecurityScanCache, SecurityScanCache, QWhere> {
  QueryBuilder<SecurityScanCache, SecurityScanCache, QAfterWhere> anyId() {
    return QueryBuilder.apply(this, (query) {
      return query.addWhereClause(const IdWhereClause.any());
    });
  }
}

extension SecurityScanCacheQueryWhere
    on QueryBuilder<SecurityScanCache, SecurityScanCache, QWhereClause> {
  QueryBuilder<SecurityScanCache, SecurityScanCache, QAfterWhereClause>
      idEqualTo(Id id) {
    return QueryBuilder.apply(this, (query) {
      return query.addWhereClause(IdWhereClause.between(
        lower: id,
        upper: id,
      ));
    });
  }

  QueryBuilder<SecurityScanCache, SecurityScanCache, QAfterWhereClause>
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

  QueryBuilder<SecurityScanCache, SecurityScanCache, QAfterWhereClause>
      idGreaterThan(Id id, {bool include = false}) {
    return QueryBuilder.apply(this, (query) {
      return query.addWhereClause(
        IdWhereClause.greaterThan(lower: id, includeLower: include),
      );
    });
  }

  QueryBuilder<SecurityScanCache, SecurityScanCache, QAfterWhereClause>
      idLessThan(Id id, {bool include = false}) {
    return QueryBuilder.apply(this, (query) {
      return query.addWhereClause(
        IdWhereClause.lessThan(upper: id, includeUpper: include),
      );
    });
  }

  QueryBuilder<SecurityScanCache, SecurityScanCache, QAfterWhereClause>
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

  QueryBuilder<SecurityScanCache, SecurityScanCache, QAfterWhereClause>
      contentHashEqualTo(String contentHash) {
    return QueryBuilder.apply(this, (query) {
      return query.addWhereClause(IndexWhereClause.equalTo(
        indexName: r'contentHash',
        value: [contentHash],
      ));
    });
  }

  QueryBuilder<SecurityScanCache, SecurityScanCache, QAfterWhereClause>
      contentHashNotEqualTo(String contentHash) {
    return QueryBuilder.apply(this, (query) {
      if (query.whereSort == Sort.asc) {
        return query
            .addWhereClause(IndexWhereClause.between(
              indexName: r'contentHash',
              lower: [],
              upper: [contentHash],
              includeUpper: false,
            ))
            .addWhereClause(IndexWhereClause.between(
              indexName: r'contentHash',
              lower: [contentHash],
              includeLower: false,
              upper: [],
            ));
      } else {
        return query
            .addWhereClause(IndexWhereClause.between(
              indexName: r'contentHash',
              lower: [contentHash],
              includeLower: false,
              upper: [],
            ))
            .addWhereClause(IndexWhereClause.between(
              indexName: r'contentHash',
              lower: [],
              upper: [contentHash],
              includeUpper: false,
            ));
      }
    });
  }
}

extension SecurityScanCacheQueryFilter
    on QueryBuilder<SecurityScanCache, SecurityScanCache, QFilterCondition> {
  QueryBuilder<SecurityScanCache, SecurityScanCache, QAfterFilterCondition>
      contentHashEqualTo(
    String value, {
    bool caseSensitive = true,
  }) {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(FilterCondition.equalTo(
        property: r'contentHash',
        value: value,
        caseSensitive: caseSensitive,
      ));
    });
  }

  QueryBuilder<SecurityScanCache, SecurityScanCache, QAfterFilterCondition>
      contentHashGreaterThan(
    String value, {
    bool include = false,
    bool caseSensitive = true,
  }) {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(FilterCondition.greaterThan(
        include: include,
        property: r'contentHash',
        value: value,
        caseSensitive: caseSensitive,
      ));
    });
  }

  QueryBuilder<SecurityScanCache, SecurityScanCache, QAfterFilterCondition>
      contentHashLessThan(
    String value, {
    bool include = false,
    bool caseSensitive = true,
  }) {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(FilterCondition.lessThan(
        include: include,
        property: r'contentHash',
        value: value,
        caseSensitive: caseSensitive,
      ));
    });
  }

  QueryBuilder<SecurityScanCache, SecurityScanCache, QAfterFilterCondition>
      contentHashBetween(
    String lower,
    String upper, {
    bool includeLower = true,
    bool includeUpper = true,
    bool caseSensitive = true,
  }) {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(FilterCondition.between(
        property: r'contentHash',
        lower: lower,
        includeLower: includeLower,
        upper: upper,
        includeUpper: includeUpper,
        caseSensitive: caseSensitive,
      ));
    });
  }

  QueryBuilder<SecurityScanCache, SecurityScanCache, QAfterFilterCondition>
      contentHashStartsWith(
    String value, {
    bool caseSensitive = true,
  }) {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(FilterCondition.startsWith(
        property: r'contentHash',
        value: value,
        caseSensitive: caseSensitive,
      ));
    });
  }

  QueryBuilder<SecurityScanCache, SecurityScanCache, QAfterFilterCondition>
      contentHashEndsWith(
    String value, {
    bool caseSensitive = true,
  }) {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(FilterCondition.endsWith(
        property: r'contentHash',
        value: value,
        caseSensitive: caseSensitive,
      ));
    });
  }

  QueryBuilder<SecurityScanCache, SecurityScanCache, QAfterFilterCondition>
      contentHashContains(String value, {bool caseSensitive = true}) {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(FilterCondition.contains(
        property: r'contentHash',
        value: value,
        caseSensitive: caseSensitive,
      ));
    });
  }

  QueryBuilder<SecurityScanCache, SecurityScanCache, QAfterFilterCondition>
      contentHashMatches(String pattern, {bool caseSensitive = true}) {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(FilterCondition.matches(
        property: r'contentHash',
        wildcard: pattern,
        caseSensitive: caseSensitive,
      ));
    });
  }

  QueryBuilder<SecurityScanCache, SecurityScanCache, QAfterFilterCondition>
      contentHashIsEmpty() {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(FilterCondition.equalTo(
        property: r'contentHash',
        value: '',
      ));
    });
  }

  QueryBuilder<SecurityScanCache, SecurityScanCache, QAfterFilterCondition>
      contentHashIsNotEmpty() {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(FilterCondition.greaterThan(
        property: r'contentHash',
        value: '',
      ));
    });
  }

  QueryBuilder<SecurityScanCache, SecurityScanCache, QAfterFilterCondition>
      expiresAtEqualTo(DateTime value) {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(FilterCondition.equalTo(
        property: r'expiresAt',
        value: value,
      ));
    });
  }

  QueryBuilder<SecurityScanCache, SecurityScanCache, QAfterFilterCondition>
      expiresAtGreaterThan(
    DateTime value, {
    bool include = false,
  }) {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(FilterCondition.greaterThan(
        include: include,
        property: r'expiresAt',
        value: value,
      ));
    });
  }

  QueryBuilder<SecurityScanCache, SecurityScanCache, QAfterFilterCondition>
      expiresAtLessThan(
    DateTime value, {
    bool include = false,
  }) {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(FilterCondition.lessThan(
        include: include,
        property: r'expiresAt',
        value: value,
      ));
    });
  }

  QueryBuilder<SecurityScanCache, SecurityScanCache, QAfterFilterCondition>
      expiresAtBetween(
    DateTime lower,
    DateTime upper, {
    bool includeLower = true,
    bool includeUpper = true,
  }) {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(FilterCondition.between(
        property: r'expiresAt',
        lower: lower,
        includeLower: includeLower,
        upper: upper,
        includeUpper: includeUpper,
      ));
    });
  }

  QueryBuilder<SecurityScanCache, SecurityScanCache, QAfterFilterCondition>
      hasDangerousUrlsEqualTo(bool value) {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(FilterCondition.equalTo(
        property: r'hasDangerousUrls',
        value: value,
      ));
    });
  }

  QueryBuilder<SecurityScanCache, SecurityScanCache, QAfterFilterCondition>
      hasSuspiciousUrlsEqualTo(bool value) {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(FilterCondition.equalTo(
        property: r'hasSuspiciousUrls',
        value: value,
      ));
    });
  }

  QueryBuilder<SecurityScanCache, SecurityScanCache, QAfterFilterCondition>
      idEqualTo(Id value) {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(FilterCondition.equalTo(
        property: r'id',
        value: value,
      ));
    });
  }

  QueryBuilder<SecurityScanCache, SecurityScanCache, QAfterFilterCondition>
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

  QueryBuilder<SecurityScanCache, SecurityScanCache, QAfterFilterCondition>
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

  QueryBuilder<SecurityScanCache, SecurityScanCache, QAfterFilterCondition>
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

  QueryBuilder<SecurityScanCache, SecurityScanCache, QAfterFilterCondition>
      isSafeEqualTo(bool value) {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(FilterCondition.equalTo(
        property: r'isSafe',
        value: value,
      ));
    });
  }

  QueryBuilder<SecurityScanCache, SecurityScanCache, QAfterFilterCondition>
      scanDateEqualTo(DateTime value) {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(FilterCondition.equalTo(
        property: r'scanDate',
        value: value,
      ));
    });
  }

  QueryBuilder<SecurityScanCache, SecurityScanCache, QAfterFilterCondition>
      scanDateGreaterThan(
    DateTime value, {
    bool include = false,
  }) {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(FilterCondition.greaterThan(
        include: include,
        property: r'scanDate',
        value: value,
      ));
    });
  }

  QueryBuilder<SecurityScanCache, SecurityScanCache, QAfterFilterCondition>
      scanDateLessThan(
    DateTime value, {
    bool include = false,
  }) {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(FilterCondition.lessThan(
        include: include,
        property: r'scanDate',
        value: value,
      ));
    });
  }

  QueryBuilder<SecurityScanCache, SecurityScanCache, QAfterFilterCondition>
      scanDateBetween(
    DateTime lower,
    DateTime upper, {
    bool includeLower = true,
    bool includeUpper = true,
  }) {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(FilterCondition.between(
        property: r'scanDate',
        lower: lower,
        includeLower: includeLower,
        upper: upper,
        includeUpper: includeUpper,
      ));
    });
  }

  QueryBuilder<SecurityScanCache, SecurityScanCache, QAfterFilterCondition>
      threatLevelEqualTo(int value) {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(FilterCondition.equalTo(
        property: r'threatLevel',
        value: value,
      ));
    });
  }

  QueryBuilder<SecurityScanCache, SecurityScanCache, QAfterFilterCondition>
      threatLevelGreaterThan(
    int value, {
    bool include = false,
  }) {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(FilterCondition.greaterThan(
        include: include,
        property: r'threatLevel',
        value: value,
      ));
    });
  }

  QueryBuilder<SecurityScanCache, SecurityScanCache, QAfterFilterCondition>
      threatLevelLessThan(
    int value, {
    bool include = false,
  }) {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(FilterCondition.lessThan(
        include: include,
        property: r'threatLevel',
        value: value,
      ));
    });
  }

  QueryBuilder<SecurityScanCache, SecurityScanCache, QAfterFilterCondition>
      threatLevelBetween(
    int lower,
    int upper, {
    bool includeLower = true,
    bool includeUpper = true,
  }) {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(FilterCondition.between(
        property: r'threatLevel',
        lower: lower,
        includeLower: includeLower,
        upper: upper,
        includeUpper: includeUpper,
      ));
    });
  }

  QueryBuilder<SecurityScanCache, SecurityScanCache, QAfterFilterCondition>
      urlsEqualTo(
    String value, {
    bool caseSensitive = true,
  }) {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(FilterCondition.equalTo(
        property: r'urls',
        value: value,
        caseSensitive: caseSensitive,
      ));
    });
  }

  QueryBuilder<SecurityScanCache, SecurityScanCache, QAfterFilterCondition>
      urlsGreaterThan(
    String value, {
    bool include = false,
    bool caseSensitive = true,
  }) {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(FilterCondition.greaterThan(
        include: include,
        property: r'urls',
        value: value,
        caseSensitive: caseSensitive,
      ));
    });
  }

  QueryBuilder<SecurityScanCache, SecurityScanCache, QAfterFilterCondition>
      urlsLessThan(
    String value, {
    bool include = false,
    bool caseSensitive = true,
  }) {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(FilterCondition.lessThan(
        include: include,
        property: r'urls',
        value: value,
        caseSensitive: caseSensitive,
      ));
    });
  }

  QueryBuilder<SecurityScanCache, SecurityScanCache, QAfterFilterCondition>
      urlsBetween(
    String lower,
    String upper, {
    bool includeLower = true,
    bool includeUpper = true,
    bool caseSensitive = true,
  }) {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(FilterCondition.between(
        property: r'urls',
        lower: lower,
        includeLower: includeLower,
        upper: upper,
        includeUpper: includeUpper,
        caseSensitive: caseSensitive,
      ));
    });
  }

  QueryBuilder<SecurityScanCache, SecurityScanCache, QAfterFilterCondition>
      urlsStartsWith(
    String value, {
    bool caseSensitive = true,
  }) {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(FilterCondition.startsWith(
        property: r'urls',
        value: value,
        caseSensitive: caseSensitive,
      ));
    });
  }

  QueryBuilder<SecurityScanCache, SecurityScanCache, QAfterFilterCondition>
      urlsEndsWith(
    String value, {
    bool caseSensitive = true,
  }) {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(FilterCondition.endsWith(
        property: r'urls',
        value: value,
        caseSensitive: caseSensitive,
      ));
    });
  }

  QueryBuilder<SecurityScanCache, SecurityScanCache, QAfterFilterCondition>
      urlsContains(String value, {bool caseSensitive = true}) {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(FilterCondition.contains(
        property: r'urls',
        value: value,
        caseSensitive: caseSensitive,
      ));
    });
  }

  QueryBuilder<SecurityScanCache, SecurityScanCache, QAfterFilterCondition>
      urlsMatches(String pattern, {bool caseSensitive = true}) {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(FilterCondition.matches(
        property: r'urls',
        wildcard: pattern,
        caseSensitive: caseSensitive,
      ));
    });
  }

  QueryBuilder<SecurityScanCache, SecurityScanCache, QAfterFilterCondition>
      urlsIsEmpty() {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(FilterCondition.equalTo(
        property: r'urls',
        value: '',
      ));
    });
  }

  QueryBuilder<SecurityScanCache, SecurityScanCache, QAfterFilterCondition>
      urlsIsNotEmpty() {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(FilterCondition.greaterThan(
        property: r'urls',
        value: '',
      ));
    });
  }

  QueryBuilder<SecurityScanCache, SecurityScanCache, QAfterFilterCondition>
      warningsIsNull() {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(const FilterCondition.isNull(
        property: r'warnings',
      ));
    });
  }

  QueryBuilder<SecurityScanCache, SecurityScanCache, QAfterFilterCondition>
      warningsIsNotNull() {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(const FilterCondition.isNotNull(
        property: r'warnings',
      ));
    });
  }

  QueryBuilder<SecurityScanCache, SecurityScanCache, QAfterFilterCondition>
      warningsEqualTo(
    String? value, {
    bool caseSensitive = true,
  }) {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(FilterCondition.equalTo(
        property: r'warnings',
        value: value,
        caseSensitive: caseSensitive,
      ));
    });
  }

  QueryBuilder<SecurityScanCache, SecurityScanCache, QAfterFilterCondition>
      warningsGreaterThan(
    String? value, {
    bool include = false,
    bool caseSensitive = true,
  }) {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(FilterCondition.greaterThan(
        include: include,
        property: r'warnings',
        value: value,
        caseSensitive: caseSensitive,
      ));
    });
  }

  QueryBuilder<SecurityScanCache, SecurityScanCache, QAfterFilterCondition>
      warningsLessThan(
    String? value, {
    bool include = false,
    bool caseSensitive = true,
  }) {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(FilterCondition.lessThan(
        include: include,
        property: r'warnings',
        value: value,
        caseSensitive: caseSensitive,
      ));
    });
  }

  QueryBuilder<SecurityScanCache, SecurityScanCache, QAfterFilterCondition>
      warningsBetween(
    String? lower,
    String? upper, {
    bool includeLower = true,
    bool includeUpper = true,
    bool caseSensitive = true,
  }) {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(FilterCondition.between(
        property: r'warnings',
        lower: lower,
        includeLower: includeLower,
        upper: upper,
        includeUpper: includeUpper,
        caseSensitive: caseSensitive,
      ));
    });
  }

  QueryBuilder<SecurityScanCache, SecurityScanCache, QAfterFilterCondition>
      warningsStartsWith(
    String value, {
    bool caseSensitive = true,
  }) {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(FilterCondition.startsWith(
        property: r'warnings',
        value: value,
        caseSensitive: caseSensitive,
      ));
    });
  }

  QueryBuilder<SecurityScanCache, SecurityScanCache, QAfterFilterCondition>
      warningsEndsWith(
    String value, {
    bool caseSensitive = true,
  }) {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(FilterCondition.endsWith(
        property: r'warnings',
        value: value,
        caseSensitive: caseSensitive,
      ));
    });
  }

  QueryBuilder<SecurityScanCache, SecurityScanCache, QAfterFilterCondition>
      warningsContains(String value, {bool caseSensitive = true}) {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(FilterCondition.contains(
        property: r'warnings',
        value: value,
        caseSensitive: caseSensitive,
      ));
    });
  }

  QueryBuilder<SecurityScanCache, SecurityScanCache, QAfterFilterCondition>
      warningsMatches(String pattern, {bool caseSensitive = true}) {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(FilterCondition.matches(
        property: r'warnings',
        wildcard: pattern,
        caseSensitive: caseSensitive,
      ));
    });
  }

  QueryBuilder<SecurityScanCache, SecurityScanCache, QAfterFilterCondition>
      warningsIsEmpty() {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(FilterCondition.equalTo(
        property: r'warnings',
        value: '',
      ));
    });
  }

  QueryBuilder<SecurityScanCache, SecurityScanCache, QAfterFilterCondition>
      warningsIsNotEmpty() {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(FilterCondition.greaterThan(
        property: r'warnings',
        value: '',
      ));
    });
  }
}

extension SecurityScanCacheQueryObject
    on QueryBuilder<SecurityScanCache, SecurityScanCache, QFilterCondition> {}

extension SecurityScanCacheQueryLinks
    on QueryBuilder<SecurityScanCache, SecurityScanCache, QFilterCondition> {}

extension SecurityScanCacheQuerySortBy
    on QueryBuilder<SecurityScanCache, SecurityScanCache, QSortBy> {
  QueryBuilder<SecurityScanCache, SecurityScanCache, QAfterSortBy>
      sortByContentHash() {
    return QueryBuilder.apply(this, (query) {
      return query.addSortBy(r'contentHash', Sort.asc);
    });
  }

  QueryBuilder<SecurityScanCache, SecurityScanCache, QAfterSortBy>
      sortByContentHashDesc() {
    return QueryBuilder.apply(this, (query) {
      return query.addSortBy(r'contentHash', Sort.desc);
    });
  }

  QueryBuilder<SecurityScanCache, SecurityScanCache, QAfterSortBy>
      sortByExpiresAt() {
    return QueryBuilder.apply(this, (query) {
      return query.addSortBy(r'expiresAt', Sort.asc);
    });
  }

  QueryBuilder<SecurityScanCache, SecurityScanCache, QAfterSortBy>
      sortByExpiresAtDesc() {
    return QueryBuilder.apply(this, (query) {
      return query.addSortBy(r'expiresAt', Sort.desc);
    });
  }

  QueryBuilder<SecurityScanCache, SecurityScanCache, QAfterSortBy>
      sortByHasDangerousUrls() {
    return QueryBuilder.apply(this, (query) {
      return query.addSortBy(r'hasDangerousUrls', Sort.asc);
    });
  }

  QueryBuilder<SecurityScanCache, SecurityScanCache, QAfterSortBy>
      sortByHasDangerousUrlsDesc() {
    return QueryBuilder.apply(this, (query) {
      return query.addSortBy(r'hasDangerousUrls', Sort.desc);
    });
  }

  QueryBuilder<SecurityScanCache, SecurityScanCache, QAfterSortBy>
      sortByHasSuspiciousUrls() {
    return QueryBuilder.apply(this, (query) {
      return query.addSortBy(r'hasSuspiciousUrls', Sort.asc);
    });
  }

  QueryBuilder<SecurityScanCache, SecurityScanCache, QAfterSortBy>
      sortByHasSuspiciousUrlsDesc() {
    return QueryBuilder.apply(this, (query) {
      return query.addSortBy(r'hasSuspiciousUrls', Sort.desc);
    });
  }

  QueryBuilder<SecurityScanCache, SecurityScanCache, QAfterSortBy>
      sortByIsSafe() {
    return QueryBuilder.apply(this, (query) {
      return query.addSortBy(r'isSafe', Sort.asc);
    });
  }

  QueryBuilder<SecurityScanCache, SecurityScanCache, QAfterSortBy>
      sortByIsSafeDesc() {
    return QueryBuilder.apply(this, (query) {
      return query.addSortBy(r'isSafe', Sort.desc);
    });
  }

  QueryBuilder<SecurityScanCache, SecurityScanCache, QAfterSortBy>
      sortByScanDate() {
    return QueryBuilder.apply(this, (query) {
      return query.addSortBy(r'scanDate', Sort.asc);
    });
  }

  QueryBuilder<SecurityScanCache, SecurityScanCache, QAfterSortBy>
      sortByScanDateDesc() {
    return QueryBuilder.apply(this, (query) {
      return query.addSortBy(r'scanDate', Sort.desc);
    });
  }

  QueryBuilder<SecurityScanCache, SecurityScanCache, QAfterSortBy>
      sortByThreatLevel() {
    return QueryBuilder.apply(this, (query) {
      return query.addSortBy(r'threatLevel', Sort.asc);
    });
  }

  QueryBuilder<SecurityScanCache, SecurityScanCache, QAfterSortBy>
      sortByThreatLevelDesc() {
    return QueryBuilder.apply(this, (query) {
      return query.addSortBy(r'threatLevel', Sort.desc);
    });
  }

  QueryBuilder<SecurityScanCache, SecurityScanCache, QAfterSortBy>
      sortByUrls() {
    return QueryBuilder.apply(this, (query) {
      return query.addSortBy(r'urls', Sort.asc);
    });
  }

  QueryBuilder<SecurityScanCache, SecurityScanCache, QAfterSortBy>
      sortByUrlsDesc() {
    return QueryBuilder.apply(this, (query) {
      return query.addSortBy(r'urls', Sort.desc);
    });
  }

  QueryBuilder<SecurityScanCache, SecurityScanCache, QAfterSortBy>
      sortByWarnings() {
    return QueryBuilder.apply(this, (query) {
      return query.addSortBy(r'warnings', Sort.asc);
    });
  }

  QueryBuilder<SecurityScanCache, SecurityScanCache, QAfterSortBy>
      sortByWarningsDesc() {
    return QueryBuilder.apply(this, (query) {
      return query.addSortBy(r'warnings', Sort.desc);
    });
  }
}

extension SecurityScanCacheQuerySortThenBy
    on QueryBuilder<SecurityScanCache, SecurityScanCache, QSortThenBy> {
  QueryBuilder<SecurityScanCache, SecurityScanCache, QAfterSortBy>
      thenByContentHash() {
    return QueryBuilder.apply(this, (query) {
      return query.addSortBy(r'contentHash', Sort.asc);
    });
  }

  QueryBuilder<SecurityScanCache, SecurityScanCache, QAfterSortBy>
      thenByContentHashDesc() {
    return QueryBuilder.apply(this, (query) {
      return query.addSortBy(r'contentHash', Sort.desc);
    });
  }

  QueryBuilder<SecurityScanCache, SecurityScanCache, QAfterSortBy>
      thenByExpiresAt() {
    return QueryBuilder.apply(this, (query) {
      return query.addSortBy(r'expiresAt', Sort.asc);
    });
  }

  QueryBuilder<SecurityScanCache, SecurityScanCache, QAfterSortBy>
      thenByExpiresAtDesc() {
    return QueryBuilder.apply(this, (query) {
      return query.addSortBy(r'expiresAt', Sort.desc);
    });
  }

  QueryBuilder<SecurityScanCache, SecurityScanCache, QAfterSortBy>
      thenByHasDangerousUrls() {
    return QueryBuilder.apply(this, (query) {
      return query.addSortBy(r'hasDangerousUrls', Sort.asc);
    });
  }

  QueryBuilder<SecurityScanCache, SecurityScanCache, QAfterSortBy>
      thenByHasDangerousUrlsDesc() {
    return QueryBuilder.apply(this, (query) {
      return query.addSortBy(r'hasDangerousUrls', Sort.desc);
    });
  }

  QueryBuilder<SecurityScanCache, SecurityScanCache, QAfterSortBy>
      thenByHasSuspiciousUrls() {
    return QueryBuilder.apply(this, (query) {
      return query.addSortBy(r'hasSuspiciousUrls', Sort.asc);
    });
  }

  QueryBuilder<SecurityScanCache, SecurityScanCache, QAfterSortBy>
      thenByHasSuspiciousUrlsDesc() {
    return QueryBuilder.apply(this, (query) {
      return query.addSortBy(r'hasSuspiciousUrls', Sort.desc);
    });
  }

  QueryBuilder<SecurityScanCache, SecurityScanCache, QAfterSortBy> thenById() {
    return QueryBuilder.apply(this, (query) {
      return query.addSortBy(r'id', Sort.asc);
    });
  }

  QueryBuilder<SecurityScanCache, SecurityScanCache, QAfterSortBy>
      thenByIdDesc() {
    return QueryBuilder.apply(this, (query) {
      return query.addSortBy(r'id', Sort.desc);
    });
  }

  QueryBuilder<SecurityScanCache, SecurityScanCache, QAfterSortBy>
      thenByIsSafe() {
    return QueryBuilder.apply(this, (query) {
      return query.addSortBy(r'isSafe', Sort.asc);
    });
  }

  QueryBuilder<SecurityScanCache, SecurityScanCache, QAfterSortBy>
      thenByIsSafeDesc() {
    return QueryBuilder.apply(this, (query) {
      return query.addSortBy(r'isSafe', Sort.desc);
    });
  }

  QueryBuilder<SecurityScanCache, SecurityScanCache, QAfterSortBy>
      thenByScanDate() {
    return QueryBuilder.apply(this, (query) {
      return query.addSortBy(r'scanDate', Sort.asc);
    });
  }

  QueryBuilder<SecurityScanCache, SecurityScanCache, QAfterSortBy>
      thenByScanDateDesc() {
    return QueryBuilder.apply(this, (query) {
      return query.addSortBy(r'scanDate', Sort.desc);
    });
  }

  QueryBuilder<SecurityScanCache, SecurityScanCache, QAfterSortBy>
      thenByThreatLevel() {
    return QueryBuilder.apply(this, (query) {
      return query.addSortBy(r'threatLevel', Sort.asc);
    });
  }

  QueryBuilder<SecurityScanCache, SecurityScanCache, QAfterSortBy>
      thenByThreatLevelDesc() {
    return QueryBuilder.apply(this, (query) {
      return query.addSortBy(r'threatLevel', Sort.desc);
    });
  }

  QueryBuilder<SecurityScanCache, SecurityScanCache, QAfterSortBy>
      thenByUrls() {
    return QueryBuilder.apply(this, (query) {
      return query.addSortBy(r'urls', Sort.asc);
    });
  }

  QueryBuilder<SecurityScanCache, SecurityScanCache, QAfterSortBy>
      thenByUrlsDesc() {
    return QueryBuilder.apply(this, (query) {
      return query.addSortBy(r'urls', Sort.desc);
    });
  }

  QueryBuilder<SecurityScanCache, SecurityScanCache, QAfterSortBy>
      thenByWarnings() {
    return QueryBuilder.apply(this, (query) {
      return query.addSortBy(r'warnings', Sort.asc);
    });
  }

  QueryBuilder<SecurityScanCache, SecurityScanCache, QAfterSortBy>
      thenByWarningsDesc() {
    return QueryBuilder.apply(this, (query) {
      return query.addSortBy(r'warnings', Sort.desc);
    });
  }
}

extension SecurityScanCacheQueryWhereDistinct
    on QueryBuilder<SecurityScanCache, SecurityScanCache, QDistinct> {
  QueryBuilder<SecurityScanCache, SecurityScanCache, QDistinct>
      distinctByContentHash({bool caseSensitive = true}) {
    return QueryBuilder.apply(this, (query) {
      return query.addDistinctBy(r'contentHash', caseSensitive: caseSensitive);
    });
  }

  QueryBuilder<SecurityScanCache, SecurityScanCache, QDistinct>
      distinctByExpiresAt() {
    return QueryBuilder.apply(this, (query) {
      return query.addDistinctBy(r'expiresAt');
    });
  }

  QueryBuilder<SecurityScanCache, SecurityScanCache, QDistinct>
      distinctByHasDangerousUrls() {
    return QueryBuilder.apply(this, (query) {
      return query.addDistinctBy(r'hasDangerousUrls');
    });
  }

  QueryBuilder<SecurityScanCache, SecurityScanCache, QDistinct>
      distinctByHasSuspiciousUrls() {
    return QueryBuilder.apply(this, (query) {
      return query.addDistinctBy(r'hasSuspiciousUrls');
    });
  }

  QueryBuilder<SecurityScanCache, SecurityScanCache, QDistinct>
      distinctByIsSafe() {
    return QueryBuilder.apply(this, (query) {
      return query.addDistinctBy(r'isSafe');
    });
  }

  QueryBuilder<SecurityScanCache, SecurityScanCache, QDistinct>
      distinctByScanDate() {
    return QueryBuilder.apply(this, (query) {
      return query.addDistinctBy(r'scanDate');
    });
  }

  QueryBuilder<SecurityScanCache, SecurityScanCache, QDistinct>
      distinctByThreatLevel() {
    return QueryBuilder.apply(this, (query) {
      return query.addDistinctBy(r'threatLevel');
    });
  }

  QueryBuilder<SecurityScanCache, SecurityScanCache, QDistinct> distinctByUrls(
      {bool caseSensitive = true}) {
    return QueryBuilder.apply(this, (query) {
      return query.addDistinctBy(r'urls', caseSensitive: caseSensitive);
    });
  }

  QueryBuilder<SecurityScanCache, SecurityScanCache, QDistinct>
      distinctByWarnings({bool caseSensitive = true}) {
    return QueryBuilder.apply(this, (query) {
      return query.addDistinctBy(r'warnings', caseSensitive: caseSensitive);
    });
  }
}

extension SecurityScanCacheQueryProperty
    on QueryBuilder<SecurityScanCache, SecurityScanCache, QQueryProperty> {
  QueryBuilder<SecurityScanCache, int, QQueryOperations> idProperty() {
    return QueryBuilder.apply(this, (query) {
      return query.addPropertyName(r'id');
    });
  }

  QueryBuilder<SecurityScanCache, String, QQueryOperations>
      contentHashProperty() {
    return QueryBuilder.apply(this, (query) {
      return query.addPropertyName(r'contentHash');
    });
  }

  QueryBuilder<SecurityScanCache, DateTime, QQueryOperations>
      expiresAtProperty() {
    return QueryBuilder.apply(this, (query) {
      return query.addPropertyName(r'expiresAt');
    });
  }

  QueryBuilder<SecurityScanCache, bool, QQueryOperations>
      hasDangerousUrlsProperty() {
    return QueryBuilder.apply(this, (query) {
      return query.addPropertyName(r'hasDangerousUrls');
    });
  }

  QueryBuilder<SecurityScanCache, bool, QQueryOperations>
      hasSuspiciousUrlsProperty() {
    return QueryBuilder.apply(this, (query) {
      return query.addPropertyName(r'hasSuspiciousUrls');
    });
  }

  QueryBuilder<SecurityScanCache, bool, QQueryOperations> isSafeProperty() {
    return QueryBuilder.apply(this, (query) {
      return query.addPropertyName(r'isSafe');
    });
  }

  QueryBuilder<SecurityScanCache, DateTime, QQueryOperations>
      scanDateProperty() {
    return QueryBuilder.apply(this, (query) {
      return query.addPropertyName(r'scanDate');
    });
  }

  QueryBuilder<SecurityScanCache, int, QQueryOperations> threatLevelProperty() {
    return QueryBuilder.apply(this, (query) {
      return query.addPropertyName(r'threatLevel');
    });
  }

  QueryBuilder<SecurityScanCache, String, QQueryOperations> urlsProperty() {
    return QueryBuilder.apply(this, (query) {
      return query.addPropertyName(r'urls');
    });
  }

  QueryBuilder<SecurityScanCache, String?, QQueryOperations>
      warningsProperty() {
    return QueryBuilder.apply(this, (query) {
      return query.addPropertyName(r'warnings');
    });
  }
}
