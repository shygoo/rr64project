// in RAM: 8018E480 static file table, 801B2840 active file table
// file system header: 0000003E 00DDF0C0 00000000 0001 1170 03E8 1324 039E 0346
// entries 0x0000 through 0x0404 are texture files
// entries 0x0405+ are mesh files

const RA_FILE_TABLE = 0x0018D380; 
const NUM_FILES = 0x16C2;

const RA_UNK_FILE = 0x000AA4C0;
const RA_PATH_DATA = RA_UNK_FILE + 0x418;
const NUM_PATH_POINTS = 3053;

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
    this.numSubMeshes = dv.getUint16(offset + 0x00C);
    this.offsNonGfx = dv.getUint32(offset + 0x010); // collision stuff?
    // ...
    this.worldX = dv.getFloat32(offset + 0x01C);
    this.worldY = dv.getFloat32(offset + 0x020);
    this.worldZ = dv.getFloat32(offset + 0x024);
    // ...
}

function SubMeshInfo(dv, offset)
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
