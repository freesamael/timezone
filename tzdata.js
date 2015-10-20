// import modules
var fs = require('fs');
var Parser = require('binary-parser').Parser;

// load tzdata
var tzdataBuffer = fs.readFileSync('tzdata');

// zone index parser
var zoneIndexParser = new Parser()
  .string('name', { length: 40, stripNull: true })
  .int32('offset')
  .int32('size')
  .int32('gmtoffset');

// tzdata index parser
var tzdataIndexParser = new Parser()
  .string('tzdataVersion', { length: 12, stripNull: true })
  .int32('indexOffset')
  .int32('dataOffset')
  .int32('zonetabOffset')
  .array('zoneIndex', {
    type: zoneIndexParser,
    length: function() {
      return (this.dataOffset - this.indexOffset) / 52;
    }
  });

// timezone info parser
var zoneInfoParser = new Parser()
  .string('magic', { length: 4, stripNull: true })
  .string('version', { length: 1, stripNull: true })
  .string('reserved', { length: 15, stripNull: true })
  .int32be('ttisgmtcnt')
  .int32be('ttisstdcnt')
  .int32be('leapcnt')
  .int32be('timecnt')
  .int32be('typecnt')
  .int32be('charcnt');

// parse all indices
var tzdataIndex = tzdataIndexParser.parse(tzdataBuffer);

// parse all timezones
var tzdata = { meta: tzdataIndex, timezones: []};
for (var zoneIndex of tzdataIndex.zoneIndex) {
  var offset = tzdataIndex.dataOffset + zoneIndex.offset;
  var zoneBuffer = tzdataBuffer.slice(offset, offset + zoneIndex.size);
  var zoneInfo = zoneInfoParser.parse(zoneBuffer);

  // time transition info parser
  var ttinfoParser = new Parser()
    .int32be('gmtoff')
    .uint8('isdst')
    .uint8('abbrind');

  // leaps info parser
  var lsinfoParser = new Parser()
    .int32be('trans')
    .int32be('corr');

  // timezone parser
  var zoneParser = new Parser();
  if (zoneInfo.timecnt) {
    zoneParser = zoneParser
      .array('ats', { type: 'uint32be', length: zoneInfo.timecnt })
      .array('types', { type: 'uint8', length: zoneInfo.timecnt });
  }
  if (zoneInfo.typecnt) {
    zoneParser = zoneParser
      .array('ttinfo', { type: ttinfoParser, length: zoneInfo.typecnt });
  }
  zoneParser = zoneParser
    .string('chars', { length: zoneInfo.charcnt, stripNull: true });
  if (zoneInfo.leapcnt) {
    zoneParser = zoneParser
      .array('lsinfo', { type: lsinfoParser, length: zoneInfo.leapcnt });
  }

  // parse timezone
  var zone = zoneParser.parse(zoneBuffer.slice(44));

  // compose timezone object
  var timezone = {
    name: zoneIndex.name,
    zoneinfo: zoneInfo,
    types: zone.types,
    ttinfo: zone.ttinfo,
    chars: zone.chars,
    lsinfo: zone.lsinfo
  };
  if (zone.ats) {
    timezone.ats = [];
    for (var dateInSec of zone.ats) {
      // we didn't parse negative values, so show only post-1970 dates
      if (!(dateInSec & (0x1 << 31))) {
        timezone.ats.push(new Date(dateInSec * 1000).toUTCString());
      }
    }
    var redundnatTypes = timezone.types.length - timezone.ats.length;
    if (redundnatTypes) {
      // since we don't keep pre-1970 ats, remove corresponding types
      timezone.types = timezone.types.slice(redundnatTypes);
    }
  }

  tzdata.timezones.push(timezone);
}

console.log(JSON.stringify(tzdata));
