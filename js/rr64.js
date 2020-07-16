// in RAM: 8018E480 static file table, 801B2840 active file table
// file system header: 0000003E 00DDF0C0 00000000 0001 1170 03E8 1324 039E 0346
// entries 0x0000 through 0x0404 are texture files
// entries 0x0405+ are mesh files

const RA_MODEL_CATEGORY_INDICES = 0x000A8334;

const RA_UNK_FILE = 0x000AA4C0;
const RA_PATH_DATA = RA_UNK_FILE + 0x418;
const NUM_PATH_POINTS = 3053;

const RA_FILE_TABLE = 0x0018D380; 
const NUM_FILES = 0x16C2;

// 0101D440: 00000040 00248800 00000001 00000175 // (175 = number of models)
const RA_MODEL_TABLE_HEADER = 0x0101D440; 
const RA_MODEL_TABLE = 0x0101D480;
const NUM_MODELS = 0x175;

const RA_OBJECT_PLACEMENT_TABLE = 0x01265C50;
const NUM_PLACEMENT_FILES = 4900; // is this correct?

const RA_OBJECT_DEFINITION_TABLE = 0x01303208;

const RA_ITEM_COUNT = 0x01304DC0;
const RA_ITEM_TABLE = 0x01304DC4;

const RA_RACE_TABLE = 0x000B67C4;
const NUM_RACES = 58;

const SIG_TEXTURE      = 0x16;
const SIG_ANIM_TEXTURE = 0x17;
const SIG_SUBMESH      = 0x3D;
const SIG_FILE_TABLE   = 0x3E;
const SIG_MESH         = 0x3F;

const TEX_FMT_CI4      = 0x04;
const TEX_FMT_CI8      = 0x08;

function SPVertex(dv, offset)
{
    this.x = dv.getInt16(offset + 0x00);
    this.y = dv.getInt16(offset + 0x02);
    this.z = dv.getInt16(offset + 0x04);
    this.s = dv.getInt16(offset + 0x08);
    this.t = dv.getInt16(offset + 0x0A);
    this.r = dv.getUint8(offset + 0x0C);
    this.g = dv.getUint8(offset + 0x0D);
    this.b = dv.getUint8(offset + 0x0E);
    this.a = dv.getUint8(offset + 0x0F);
}

SPVertex.SIZE = 0x10;

function FileEntry(dv, offset)
{
    this.offset = dv.getUint32(offset + 0x00);
    this.size = dv.getUint32(offset + 0x04);
    this.unk08 = dv.getUint32(offset + 0x08);
}

FileEntry.SIZE = 0x0C;

function TextureHeader(dv, offset)
{
    this.signature = dv.getUint32(offset + 0x00); // 16 = single image, 17 = multiple images for animation
    this.textureFileSize = dv.getUint32(offset + 0x04);
    this.unk08 = dv.getUint32(offset + 0x08); // always FFFFFFFF
    this.fileName = dvgetstr(dv, offset + 0x0C);
    this.numTextures = dv.getUint16(offset + 0x20); // usually 1, 2+ if animated
    this.paletteSize = dv.getUint16(offset + 0x22);
    this.unk24 = dv.getUint16(offset + 0x24);   // 0x4000 = need alpha?, 0x0014 = ?
    this.ciSize = dv.getUint16(offset + 0x26);
    this.unk28 = dv.getFloat32(offset + 0x28);  // animation interval?
    this.width = dv.getUint32(offset + 0x2C);
    this.height = dv.getUint32(offset + 0x30);
    this.format = dv.getUint32(offset + 0x34); // 4 = ci4, 8 = ci8
    this.unk38 = dv.getUint32(offset + 0x38);  // always 0
    this.unk3C = dv.getUint32(offset + 0x3C);  // points to last 0x40 bytes of file?
}

TextureHeader.SIZE = 0x40;

function MeshHeader(dv, offset)
{
    this.signature = dv.getUint32(offset + 0x00);
    this.meshFileSize = dv.getUint32(offset + 0x004);
    // ...
    this.numSubMeshes = dv.getUint16(offset + 0x00C);
    this.offsCollision = dv.getUint32(offset + 0x010);
    // ...
    this.worldX = dv.getFloat32(offset + 0x01C);
    this.worldY = dv.getFloat32(offset + 0x020);
    this.worldZ = dv.getFloat32(offset + 0x024);
    // ...
}

function SubMeshInfo(dv, offset) // Reference
{
    this.subMeshOffset = dv.getUint32(offset + 0x00);
    this.subMeshSize = dv.getUint32(offset + 0x04);
    this.unk08 = dv.getUint32(offset + 0x08);
}

function SubMeshHeader(dv, offset)
{
    this.magic       = dv.getUint32(offset + 0x00); // 0x0000003D
    this.size        = dv.getUint32(offset + 0x04);
    this.unk08       = dv.getUint32(offset + 0x08);
    this.numPackets  = dv.getUint16(offset + 0x0C);
    this.numPackets2 = dv.getUint16(offset + 0x0E);
    this.unk10       = dv.getUint16(offset + 0x10);
    this.textureFileIndex = dv.getUint16(offset + 0x12); // texture file index
    this.unk14       = dv.getUint32(offset + 0x14);
}

SubMeshHeader.SIZE = 0x18;

function SubMeshPacketHeader(dv, offset)
{
    this.numTriangles = dv.getUint16(offset + 0x00);
    this.numVertices  = dv.getUint16(offset + 0x02);
    this.packetSize   = dv.getUint16(offset + 0x04);
    this.verticesSize = dv.getUint16(offset + 0x06);
}

SubMeshPacketHeader.SIZE = 8;

////////////

function ModelHeader(dv, offset)
{
    this.signature = dv.getUint32(offset + 0x00); // 0x41
    this.size = dv.getUint32(offset + 0x04);
    this.unk08 = dv.getUint32(offset + 0x08);
    this.unk0C = dv.getUint32(offset + 0x0C);
    // u8 unk10[0x30] padding?
    this.unk40 = dv.getUint32(offset + 0x40);
    this.offsCommands = dv.getUint32(offset + 0x44); // + 0x40 = offset of graph commands
    // u8 unk48[0x18] padding?
    this.numTextures = dv.getUint32(offset + 0x60);
    this.unk64 = dv.getUint32(offset + 0x64);
}

ModelHeader.SIZE = 0x68;

function Reference(dv, offset)
{
    this.offset = dv.getUint32(offset + 0x00);
    this.size = dv.getUint32(offset + 0x04);
    this.ptr = dv.getUint32(offset + 0x08);
}

Reference.SIZE = 0x0C;

function Node13(dv, offset)
{
    this.signature = dv.getUint32(offset + 0x00); // 0x13
    this.size = dv.getUint32(offset + 0x04);
    this.marker = dv.getUint32(offset + 0x08);
    this.numReferences = dv.getUint16(offset + 0x0C);
    this.unk0E = dv.getUint16(offset + 0x0E);
    this.unk10 = dv.getUint32(offset + 0x10);
    this.unk14 = dv.getUint32(offset + 0x14);
    this.unk18 = dv.getUint32(offset + 0x18);
    this.unk1C = dv.getUint32(offset + 0x1C);
    this.unk20 = dv.getUint32(offset + 0x20);
    this.unk24 = dv.getFloat32(offset + 0x24);
    this.unk28 = dv.getUint32(offset + 0x28);
    this.unk2C = dv.getUint32(offset + 0x2C);
    this.unk30 = dv.getUint32(offset + 0x30);
    this.unk34 = dv.getUint32(offset + 0x34);
    this.unk38 = dv.getUint32(offset + 0x38);
    this.unk3C = dv.getUint32(offset + 0x3C);
}

Node13.SIZE = 0x40;

function Node12(dv, offset)
{
    this.signature = dv.getUint32(offset + 0x00); // (0x12)
    this.size = dv.getUint32(offset + 0x04);
    this.marker = dv.getUint32(offset + 0x08);
    this.unk0C = dv.getUint32(offset + 0x0C); // looks like padding
    this.numReferences = dv.getUint16(offset + 0x10);
    this.unk12 = dv.getUint16(offset + 0x12);
    this.unk14 = dv.getUint32(offset + 0x14);
    this.numUnkStructsA = dv.getUint16(offset + 0x18);
    this.unk1A = dv.getUint16(offset + 0x18);
    this.unk1C = dv.getUint32(offset + 0x1C);
    this.numUnkStructsB = dv.getUint16(offset + 0x20);
    this.unk22 = dv.getUint16(offset + 0x22);
    this.unk24 = dv.getUint32(offset + 0x24);
    this.unk28 = dv.getUint32(offset + 0x28);
    this.unk2C = dv.getUint32(offset + 0x2C);
    this.unk30 = dv.getUint32(offset + 0x30);
    this.unk34 = dv.getFloat32(offset + 0x34);
    this.unk38 = dv.getUint32(offset + 0x38);
    this.unk3C = dv.getUint32(offset + 0x3C);
    this.unk40 = dv.getUint32(offset + 0x40);
    this.unk44 = dv.getUint32(offset + 0x44);
    this.unk48 = dv.getFloat32(offset + 0x48);
    this.unk4C = dv.getFloat32(offset + 0x4C);
    this.unk50 = dv.getFloat32(offset + 0x50);
    this.unk54 = dv.getFloat32(offset + 0x54);
}

Node12.SIZE = 0x58;

function Node11(dv, offset)
{
    this.signature = dv.getUint32(offset + 0x00); // (0x11)
    this.size = dv.getUint32(offset + 0x04);
    this.marker = dv.getUint32(offset + 0x08);
    this.numReferences = dv.getUint16(offset + 0x0C);
    this.unk0E = dv.getUint16(offset + 0x0E);
    this.unk10 = dv.getUint32(offset + 0x10);
    this.unk14 = dv.getUint32(offset + 0x14);
    this.unk18 = dv.getUint32(offset + 0x18);
    this.unk1C = dv.getUint32(offset + 0x1C);
    this.unk20 = dv.getUint32(offset + 0x20);
    this.unk24 = dv.getUint32(offset + 0x24);
    this.unk28 = dv.getFloat32(offset + 0x28);
    this.unk2C = dv.getFloat32(offset + 0x2C);
    this.unk30 = dv.getFloat32(offset + 0x30);
    this.unk34 = dv.getFloat32(offset + 0x34);
}

Node11.SIZE = 0x38;

function Node10(dv, offset)
{
    this.signature = dv.getUint32(offset + 0x00); // (0x10)
    this.size = dv.getUint32(offset + 0x04);
    this.marker = dv.getUint32(offset + 0x08);
    this.numPackets = dv.getUint16(offset + 0x0C);
    this.offsTextureFile = dv.getUint16(offset + 0x0E);
    this.unk10 = dv.getUint16(offset + 0x10); // (always 0x0005?)
    this.unk12 = dv.getUint16(offset + 0x12); // (always 0x0004?)
    this.unk14 = dv.getUint32(offset + 0x14);
    this.unk18 = dv.getFloat32(offset + 0x18);
    this.unk1C = dv.getFloat32(offset + 0x1C);
    this.unk20 = dv.getFloat32(offset + 0x20);
    this.unk24 = dv.getFloat32(offset + 0x24);
}

Node10.SIZE = 0x28;

//////////////////

function Item(dv, offset)
{
    this.x = dv.getFloat32(offset + 0x00);
    this.y = dv.getFloat32(offset + 0x04);
    this.z = dv.getFloat32(offset + 0x08);
    this.id = dv.getFloat32(offset + 0x0C); // not sure why this is a float
}

Item.SIZE = 0x10;

//////////////////

function ObjectPlacement(dv, offset)
{
    this.qX = dv.getFloat32(offset + 0x00); // q.x
    this.qY = dv.getFloat32(offset + 0x04); // q.y
    this.qZ = dv.getFloat32(offset + 0x08); // q.z
    this.qW = dv.getFloat32(offset + 0x0C); // q.w

    this.posX = dv.getFloat32(offset + 0x10);
    this.posY = dv.getFloat32(offset + 0x14);
    this.posZ = dv.getFloat32(offset + 0x18);
    this.unk1C = dv.getFloat32(offset + 0x1C);
    this.unk20 = dv.getFloat32(offset + 0x20);
    this.unk24 = dv.getUint32(offset + 0x24);
    this.objectIndex = dv.getUint16(offset + 0x28); // index of object definition table
    this.unk2A = dv.getUint16(offset + 0x2A);
    this.unk2C = dv.getUint32(offset + 0x2C);
}

ObjectPlacement.SIZE = 0x30;

function ObjectDefinition(dv, offset)
{
    // ...
    this.modelId_lo = dv.getUint8(offset + 0x03); // index of modelCategoryIndices
    this.modelId_hi = dv.getUint8(offset + 0x04);
    // ...
    this.collisionRadius = dv.getInt16(offset + 0x0E);
    // ...

    // modelIndex = modelCategoryInices[modelId_hi] + modelId_lo
}

ObjectDefinition.SIZE = 0x18;

//////////////

function Triangle(dv, offset)
{
    var data = dv.getUint16(offset);
    this.v0 = (data >> 10) & 0x1F;
    this.v1 = (data >>  5) & 0x1F;
    this.v2 = (data >>  0) & 0x1F;
}

Triangle.SIZE = 0x02;

//////////////

function CollisionHeader(dv, offset)
{
    this.signature = dv.getUint32(offset + 0x00); // 0x0000003C
    this.size = dv.getUint32(offset + 0x04);
    this.unk08 = dv.getUint32(offset + 0x08);
    this.unk0C = dv.getUint16(offset + 0x0C);
    this.numGroups = dv.getUint16(offset + 0x0E);
}

CollisionHeader.SIZE = 0x10;

function CollisionGroupHeader(dv, offset)
{
    this.marker = dv.getUint16(offset + 0x00);
    this.numTriangleLists = dv.getUint16(offset + 0x02);
}

CollisionGroupHeader.SIZE = 0x04;

function CollisionTriangleListHeader(dv, offset)
{
    this.offsVertices = dv.getUint16(offset + 0x00);
    this.attributeId = dv.getUint8(offset + 0x02);
    this.numTriangles = dv.getUint8(offset + 0x03);
}

CollisionTriangleListHeader.SIZE = 0x04;