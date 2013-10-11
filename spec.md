FGDB Spec
===
This is a work-in-progress reverse-engineered specification of .gdbtable and .gdbtablx files found in FileGDB datasets. It applies to FileGDB datasets v10, as well as earlier versions. Reprinted from [this page](http://trac.osgeo.org/gdal/wiki/FGDBSpecification)

Conventions
---

- _ubyte:_ unsigned byte
- _int16:_ little-endian 16-bit integer
- _int32:_ little-endian 32-bit integer
- _float64:_ little-endian 64-bit IEEE754 floating point number
- _utf16:_ string in little-endian UTF-16 encoding
- _string:_ (UTF-8 ?) string

A row or a feature are synonyms in this document.

Specification of .gdbtable files
===

.gdbtable files describe fields and contain row data.

They are made of an header, a section describing the fields, and a section describing the rows.

Header (40 bytes)
===

- _4 bytes:_ `0x03 0x00 0x00 0x00` - unknown role. Constant among the files. Kind of signature ?
- _int32:_ number of (valid) rows
- _4 bytes:_ varying values - unknown role
- _4 bytes:_ `0x05 0x00 0x00 0x00` - unknown role. Constant among the files
- _4 bytes:_ varying values - unknown role. Seems to be `0x00 0x00 0x00 0x00` for FGDB 10 files, but not for earlier versions
- _4 bytes:_ 0x00 0x00 0x00 0x00 - unknown role. Constant among the files
- _int32:_ file size in bytes
- _4 bytes:_ 0x00 0x00 0x00 0x00 - unknown role. Constant among the files
- _int32:_ offset in bytes at which the field description section begins (often 40 in FGDB 10)
- _4 bytes:_ 0x00 0x00 0x00 0x00 - unknown role. Constant among the files

Field description section
===

Fixed part
---

- _int32:_ size of header in bytes (this field excluded)
- _int32:_ version of the file ? Seems to be 3 for FGDB 9.X files and 4 for FGDB 10.X files
- _ubyte:_ layer geometry type. 1 = point, 2 = multipoint, 3= (multi)polyline, 4 = (multi)polygon
- _3 bytes:_ `0x03 0x00 0x00` - unknown role
- _int16:_ number of fields (including geometry field and implicit OBJECTID field)

Repeated part (per field)
---

Following immediately: the description of the fields (repeated as many times as the number of fields)

- _ubyte:_ number of UTF-16 characters (not bytes) of the name of the field
- _utf16:_ name of the field
- _ubyte:_ number of UTF-16 characters (not bytes) of the alias of the field. Might be 0
- _utf16:_ alias of the field (ommitted if previous field is 0)
- _ubyte:_ 0x00 (ommitted if previous field is ommited)
- _ubyte:_ field type ( 0 = int16, 1 = int32, 2 = float32, 3 = float64, 4 = string, 5 = datetime, 6 = objectid, 7 = geometry, 8 = binary, 10/11 = UUID, 12 = XML )

The next bytes for the field description depend on the field type.

For field type = 4 (string),

- _int32:_ maximum length of string
- _ubyte:_ flag
- _ubyte:_ unknown role

For field type = 6 (objectid),

- _ubyte:_ unknown role = 4
- _ubyte:_ unknown role = 2

For field type = 7 (geometry),


- _ubyte:_ unknown role = 0
- _ubyte:_ unknown role = 6 or 7
- _int16:_ length (in bytes) of the WKT string describing the SRS.
- _string:_ WKT string describing the SRS Or `{B286C06B-0879-11D2-AACA-00C04FA33C20}` for no SRS .
- _ubyte:_ "magic" (used after). Value is generally 5 or 7 (or 1 in system tables)
- _float64:_ xorigin
- _float64:_ yorigin
- _float64:_ xyscale
- _float64:_ zorigin (omitted if magic = 1)
- _float64:_ zscale (omitted if magic = 1)
- _float64:_ morigin (omitted if magic = 1 or 5)
- _float64:_ mscale (omitted if magic = 1 or 5)
- _float64:_ xytolerance
- _float64:_ ztolerance (omitted if magic = 1)
- _float64:_ mtolerance (omitted if magic = 1 or 5)
- _float64:_ xmin of layer extent (omitted if magic = 1)
- _float64:_ ymin of layer extent (omitted if magic = 1)
- _float64:_ xmax of layer extent (omitted if magic = 1)
- _float64:_ ymax of layer extent (omitted if magic = 1)


If magic > 1, there are extra bytes whose organization seems to comply to the following algorithm :

Store current offset
Skip one byte
Read int32 value "magic2".
if magic2 = 0, then rewind to the stored offset and read 2 float64 (that happen to be NaN values). And then go to 2)
otherwise (generally magic2 = 1 or magic2 = 3), skip magic2 x float64 values
For field type = 8 (binary),

- _ubyte:_ unknown role
- _ubyte:_ unknown role

For field type = 10, 11


- _ubyte:_ width : 38
- _ubyte:_ flag

For field type = 12

- _ubyte:_ width : 0
- _ubyte:_ flag

For other field types,

- _ubyte:_ width in bytes (e.g. 2 for int16, 4 for int32, 4 for float32, 8 for float64, 8 for datetime)
- _ubyte:_ flag
- _ubyte:_ unknown role

If the lsb of the flag field (when present) is set to 1, then the field can be null.

FIXME: find which byte is the flag field for geometry fields. They are supposed to be nullable for now.

Rows section
===

The rows section does not necessarily immediately follow the last field description. It starts generally a few bytes after, but not in a predictable way. Note : for FGDB layers created by the ESRI FGDB SDK API, there are 4 bytes between the end of the field description section and the beginning of the rows section : 0xDE 0xAD 0xBE 0xEF (!)

The rows section is a sequence of X rows (where X is the total number of features found in the .gdbtablx, which might be different from the number of valid rows found in the header of the .gdbtable). Each row starts at an offset indicated in the .gdbtablx file

Row description
---

- _int32:_ length in bytes of the row blob ( this field excluded)
- _ceil(number_nullable_fields / 8) * ubyte:_ flags describing if a field is null. See below explanation

Null fields flags
---

Each bit of the flags field encode for the presence or absence of the field content, for a nullable field, for the row. The flag is set to 1 if the field is missing/null, or 0 if the field is present/non-null (0 is used as well for spare bytes). The flag for the first field, in the order of the fields of the field description section (typically the geometry), is the least significant bit of the first byte of the flags field.

There are no bits reserved for non-nullable fields.

If all fields are non-nullable, the flag field is absent.

Note: there's no explicit data for OBJECTID and no reserved flag bit for it.

For each non-null field, the field content is appended in the order of the fields of the field description section.

Field content
===

Geometry field (type = 7)
---

This field is generally called "SHAPE".

Geometry blobs use 2 new encoding schemes :

- _varuint (64 bit):_ a sequence of bytes [b0, b1, ... bN]. All bytes except last one have their msb (most significant bit) set to 1. The presence of a msb = 0 marks the end of the sequence. The value of the varuint is `(b0 & 0x7F) | ((b1 & 0x7F) << 7) | ((b2 & 0x7F) << 14) | ... | ((bN & 0x7F) << (7 * N))`. Note that a valid sequence might be just 1 byte.
- _varint (64 bit):_ same concept as varuint. But the 2nd most significant bit of b0 (i.e. the one obtained by masking with 0x40) indicates the sign of the result, and should be ignored in the computation of the unsigned value : `(b0 & 0x3F) | ((b1 & 0x7F) << 6) | ((b2 & 0x7F) << 13) | ... | ((bN & 0x7F) << (7 * N - 1))`. If the bit sign is set to 1, the value must be negated.

Common preambule to all geometry types


- _varuint:_ length of the geometry blob in bytes (this field excluded)
- _ubyte:_ geometry_type. 1 = 2D point, 3 = 2D (multi)linestring, 5 = 2D (multi)polygon. Other values possible. See SHPT_ enumaration of  ogrpgeogeometry.h

The bytes of the geometry blob following this preamble depend of course on the geometry type.

For point geometries (geometry type = 1, 9, 21, 11)


- _varuint:_ x = `(varuint + xorigin * xyscale) / xyscale`
- _varuint:_ y = `(varuint + yorigin * xyscale) / xyscale`
- _varuint ( present only if Z component ):_ z = `(varuint + zorigin * zscale) / zscale`
- _varuint ( present only if M component ):_ m = `(varuint + morigin * mscale) / mscale`

For multipoint geometries (geometry type = 8, 20, 28, 18)

- _varuint:_ number of points

followed by points coordinates:

First point (i = 0):

- _varuint:_ x[0] = `(varuint + xorigin * xyscale) / xyscale`
- _varuint:_ y[0] = `(varuint + yorigin * xyscale) / xyscale`
- _varuint ( present only if Z component ):_ z[0] = `(varuint + zorigin * zscale) / zscale`
- _varuint ( present only if M component ):_ m[0] = `(varuint + morigin * mscale) / mscale`

For each next point (i > 0) (with dx = dy = dz = dm = 0 at initialization):

- _varint:_ dx = dx + varint. x[i] = x[0] + dx / xyscale
- _varint ( present only if Z component ):_ dz = `dz + varint. z[i] = z[0] + dz / zscale`
- _varint ( present only if Z component ):_ dm = `dm + varint. m[i] = m[0] + dy / mscale`

For (multi)linestring (geometry type = 3, 10, 23, 13) or (multi)polygon (geometry type = 5, 19, 25, 15)


- _varuint:_ total number of points of all following parts
- _varuint:_ number of parts, i.e. number of rings for (multi)polygon - inner and outer rings being at the same level, number of linestrings or a multilinestring, or 1 for a linestring)
- _varuint:_ number of points of first part (omitted if there is only one part)
- _...:_ ...
- _varuint:_ number of points of (number of parts - 1)th part (number of points of last part can be computed by substracting total number of points with the sum of the above numbers

followed by, for each part, points coordinates:

First point of first part :


- _varuint:_ x[0] = `(varuint + xorigin * xyscale) / xyscale`
- _varuint:_ y[0] = `(varuint + yorigin * xyscale) / xyscale`
- _varuint ( present only if Z component ):_ z[0] = `(varuint + zorigin * zscale) / zscale`
- _varuint ( present only if M component ):_ m[0] = `(varuint + morigin * mscale) / mscale`

For each next point (other points of the first part, or for all points of the following parts) :

- _varint:_ dx = `dx + varint. x[i] = x[0] + dx / xyscale`
- _varint ( present only if Z component ):_ `dz = dz + varint. z[i] = z[0] + dz / zscale`
- _varint ( present only if Z component ):_ `dm = dm + varint. m[i] = m[0] + dy / mscale`

String (type=4) or XML (type=12)

Number of bytes of the string as a varuint, followed by string content

Other types

a int16 value for a int16 field, a int32 for a int32 field, etc..

Note : datetime values are the number of days since 30th dec 1899 00:00:00, encoded as float64

Specification of .gdbtablx file
===

.gdbtablx files contain the offset of the rows of the associated .gdbtable file.

Header (16 bytes)
---

- _4 bytes:_ `0x03 0x00 0x00 0x00` - unknown role. Constant among the files. Kind of signature ?
- _4 bytes:_ `0x01 0x00 0x00 0x00` (for GDB 10?), `0x03 0x00 0x00 0x00` (for GDB 9?) - unknown role.
- _int32:_ number of rows, included deleted rows
- _4 bytes:_ `0x05 0x00 0x00 0x00` - unknown role. Constant among the files. Kind of signature ?

Offset section
---

The section starts immediately after the header (at offset 16) and is made of 5 x number_rows bytes. For each row,

- _int32:_ offset of the beginning of the row in the .gdbtable file, or 0 if the row is deleted
- _ubyte:_ constant to 0. unknown role

Padding section
---

A lot of bytes to 0.

Trailing section
---

The last few bytes look like `00 00 00 00 X 00 00 00 X 00 00 00 00 00 00 00` where X is non 0 (often 1). Unknown role