const RA_OBJECT_MODEL_CATEGORY_COUNTS = 0x000A8334;
const RA_UNK_FILE                     = 0x000AA4C0;
const RA_PATH_POINTS                  = RA_UNK_FILE + 0x418;
const RA_RACE_TABLE                   = 0x000B67C4;
const RA_MAP_PARTITION_TABLE_HEADER   = 0x0018D380; // 0000003E 00DDF0C0 00000000 00011170 03E8 1324 039E 0346 
const RA_MAP_PARTITION_TABLE          = RA_MAP_PARTITION_TABLE_HEADER + 0x18; 
const RA_OBJECT_MODEL_TABLE_HEADER    = 0x0101D440; // 00000040 00248800 00000001 00000175 (+ 0x30 padding bytes)
const RA_OBJECT_MODEL_TABLE           = RA_OBJECT_MODEL_TABLE_HEADER + 0x40;
const RA_OBJECT_PLACEMENT_TABLE       = 0x01265C50;
const RA_OBJECT_DEFINITION_TABLE      = 0x01303208;
const RA_NUM_ITEM_PLACEMENTS          = 0x01304DC0;
const RA_ITEM_PLACEMENT_TABLE         = 0x01304DC4;
// TODO these are part of a larger collection of textures referenced by
// the table at 0x01E09368, should eventually use that instead
const RA_ITEM_TEXTURES                = 0x01F49730;

const NUM_RACES = 58;
const NUM_PATH_POINTS = 3053;
const NUM_MAP_PARTITIONS = 0x16C2;
const NUM_OBJECT_MODELS = 0x175;
const NUM_PLACEMENT_FILES = 4900; // is this correct?
const NUM_OBJECT_DEFINITIONS = 0x127; // todo use header

const NUM_ITEM_TEXTURES = 16;
const ITEM_TEX_INDICES = [ // todo where is this defined?
    null,
    0x0D, 0x0E, 0x0F, 0x0C, 0x06, 0x00, 0x02, 0x05,
    0x09, 0x08, 0x01, 0x03, 0x0B, 0x0A, 0x07, 0x04
];

const SIG_TEXTURE                = 0x00000016;
const SIG_ANIM_TEXTURE           = 0x00000017;
const SIG_RACE_TABLE             = 0x0000003A; // not sure
const SIG_COLLISION              = 0x0000003C;
const SIG_MAP_SUBMESH            = 0x0000003D;
const SIG_MAP_PARTITION_TABLE    = 0x0000003E;
const SIG_MAP_PARTITION          = 0x0000003F;
const SIG_OBJECT_MODEL_TABLE     = 0x00000040;
const SIG_OBJECT_MODEL           = 0x00000041;
const SIG_OBJECT_PLACEMENT_TABLE = 0x00000046; // not sure

const SIG_MODEL_NODE_13 = 0x13;
const SIG_MODEL_NODE_12 = 0x12;
const SIG_MODEL_NODE_11 = 0x11;
const SIG_MODEL_NODE_10 = 0x10;

const TEX_FMT_CI4      = 0x04;
const TEX_FMT_CI8      = 0x08;

function RoadRash64(dvRom)
{
    this.dvRom = dvRom;

    this.mapTextures = this.parseMapTextures();
    this.mapPartitions = this.parseMapPartitions();
    this.objectDefinitions = this.parseObjectDefinitions();
    this.objectModels = this.parseObjectModels();
    this.objectPlacements = this.parseObjectPlacements();
    this.itemTextures = this.parseItemTextures();
    this.itemPlacements = this.parseItemPlacements();
}

RoadRash64.prototype.parseMapTextures = function()
{
    var mapTextures = {};
    var raReference = RA_MAP_PARTITION_TABLE;

    for(var nPartition = 0; nPartition < NUM_MAP_PARTITIONS; nPartition++)
    {
        var partitionReference = new DataReference(this.dvRom, raReference)

        if(partitionReference.offset != 0)
        {
            var raPartition = raReference + partitionReference.offset;
            var signature = this.dvRom.getUint32(raPartition + 0x00);
            var dvFile = dvpart(this.dvRom, raPartition, partitionReference.size)
    
            if(signature == SIG_TEXTURE || signature == SIG_ANIM_TEXTURE)
            {
                mapTextures[nPartition] = RoadRash64.parseTextureFile(dvFile);
            }
        }

        raReference += DataReference.SIZE;
    }

    return mapTextures;
}

RoadRash64.prototype.parseMapPartitions = function()
{
    var mapPartitions = {};
    var raReference = RA_MAP_PARTITION_TABLE;

    for(var nPartition = 0; nPartition < NUM_MAP_PARTITIONS; nPartition++)
    {
        var partitionReference = new DataReference(this.dvRom, raReference);

        if(partitionReference.offset != 0)
        {
            var raPartition = raReference + partitionReference.offset;
            var signature = this.dvRom.getUint32(raPartition + 0x00);
            var dvFile = dvpart(this.dvRom, raPartition, partitionReference.size)
    
            if(signature == SIG_MAP_PARTITION)
            {
                mapPartitions[nPartition] = this.parseMapPartition(dvFile);
            }
        }

        raReference += DataReference.SIZE;
    }

    return mapPartitions;
}

RoadRash64.prototype.parseObjectDefinitions = function()
{
    var objectDefinitions = [];

    for(var nObjectDef = 0; nObjectDef < NUM_OBJECT_DEFINITIONS; nObjectDef++)
    {
        var raObjectDef = RA_OBJECT_DEFINITION_TABLE + nObjectDef * ObjectDefinition.SIZE;
        var objectDef = new ObjectDefinition(this.dvRom, raObjectDef);
        objectDefinitions.push(objectDef);
    }

    return objectDefinitions;
}

RoadRash64.prototype.parseObjectModels = function()
{
    var objectModels = [];

    for(var nObjectModel = 0; nObjectModel < NUM_OBJECT_MODELS; nObjectModel++)
    {
        var raModelRef = RA_OBJECT_MODEL_TABLE + nObjectModel * DataReference.SIZE;
        var modelReference = new DataReference(this.dvRom, raModelRef);
        var raObjectModel = raModelRef + modelReference.offset;
        
        var dvModelFile = dvpart(this.dvRom, raObjectModel, modelReference.size);

        objectModels.push(new RR64ObjectModel(dvModelFile));
    }

    return objectModels;
}

RoadRash64.prototype.parseObjectPlacements = function()
{
    var objectPlacements = [];

    for(var nFile = 0; nFile < NUM_PLACEMENT_FILES; nFile++)
    {
        var entryOffset = nFile * 4;
        var offset = this.dvRom.getUint32(RA_OBJECT_PLACEMENT_TABLE + entryOffset);

        if(offset == 0)
        {
            continue;
        }

        var raFile = RA_OBJECT_PLACEMENT_TABLE + entryOffset + offset;
        var numPlacements = this.dvRom.getUint32(raFile);

        for(var nPlacement = 0; nPlacement < numPlacements; nPlacement++)
        {
            var raPlacement = raFile + 0x88 + nPlacement * ObjectPlacement.SIZE;
            var placement = new ObjectPlacement(this.dvRom, raPlacement);
            objectPlacements.push(placement); // todo should probably have a subarray each file
        }
    }

    return objectPlacements;
}

RoadRash64.prototype.parseItemTextures = function()
{
    var itemTextures = [];

    var raTexture = RA_ITEM_TEXTURES;

    for(var nTexture = 0; nTexture < NUM_ITEM_TEXTURES; nTexture++)
    {
        var data = rgba32_texture_from_i8(this.dvRom, raTexture, 64, 64);
        itemTextures.push(data);
        raTexture += 0x1000;
    }

    return itemTextures;
}

RoadRash64.prototype.parseItemPlacements = function()
{
    var itemPlacements = [];

    var numItemPlacements = this.dvRom.getUint32(RA_NUM_ITEM_PLACEMENTS);
    var raItemPlacement = RA_ITEM_PLACEMENT_TABLE;

    for(var nItem = 0; nItem < numItemPlacements; nItem++)
    {
        itemPlacements.push(new ItemPlacement(this.dvRom, raItemPlacement));
        raItemPlacement += ItemPlacement.SIZE;
    }

    return itemPlacements;
}

RoadRash64.prototype.parseMapPartition = function(dvPartition)
{
    var partition = {
        header: new MapPartitionHeader(dvPartition, 0x00),
        subMeshes: [],
        collision: []
    };

    // need to keep track of these for collision later
    var _packetOffsets = [];

    for(var nSubMesh = 0; nSubMesh < partition.header.numSubMeshes; nSubMesh++)
    {
        var refOffset = 0xF0 + (nSubMesh * DataReference.SIZE);
        var subMeshRef = new DataReference(dvPartition, refOffset);
        var subMeshOffset = subMeshRef.offset + refOffset;

        var subMesh = {
            header: new MapSubMeshHeader(dvPartition, subMeshOffset),
            geometryPackets: []
        };

        var packetOffset = subMeshOffset + MapSubMeshHeader.SIZE;

        for(var nPacket = 0; nPacket < subMesh.header.numPackets; nPacket++)
        {
            _packetOffsets.push({ nSubMesh: nSubMesh, nPacket: nPacket, packetOffset: packetOffset });

            var packet = RoadRash64.parseGeometryPacket(dvPartition, packetOffset);
            packetOffset += packet.header.packetSize;
            subMesh.geometryPackets.push(packet);
        }

        partition.subMeshes.push(subMesh);
    }

    var collisionHeader = new CollisionHeader(dvPartition, partition.header.offsCollision);
    for(var nGroup = 0; nGroup < collisionHeader.numGroups; nGroup++)
    {
        var collisionGroup = [];

        var offsCollisionGroup = dvPartition.getUint16(partition.header.offsCollision + CollisionHeader.SIZE + nGroup * 2);
        var groupHeader = new CollisionGroupHeader(dvPartition, partition.header.offsCollision + offsCollisionGroup);
        var offsTriangleList = partition.header.offsCollision + offsCollisionGroup + CollisionGroupHeader.SIZE;

        for(var nList = 0; nList < groupHeader.numTriangleLists; nList++)
        {
            var triangleList = {
                surfaceTypeId: 0,
                triangles: [],
                nSubMesh: 0,
                nPacket: 0
            };

            var triangleListHeader = new CollisionTriangleListHeader(dvPartition, offsTriangleList);
            offsTriangleList += CollisionTriangleListHeader.SIZE;

            // figure out which submesh/geometry packet this is for
            var idx = _packetOffsets.findIndex(o => {
                return o.packetOffset == (triangleListHeader.offsVertices - GeometryPacketHeader.SIZE);
            });

            triangleList.surfaceTypeId = triangleListHeader.surfaceTypeId;
            triangleList.nSubMesh = _packetOffsets[idx].nSubMesh;
            triangleList.nPacket = _packetOffsets[idx].nPacket;

            for(var nTri = 0; nTri < triangleListHeader.numTriangles; nTri++)
            {
                var tri = new Triangle(dvPartition, offsTriangleList);
                offsTriangleList += Triangle.SIZE;
                triangleList.triangles.push(tri);
            }

            collisionGroup.push(triangleList)

            if((offsTriangleList % 4) != 0) offsTriangleList += 2;
        }

        partition.collision.push(collisionGroup);
    }

    return partition;
}

RoadRash64.prototype.getModelIndex = function(modelId_hi, modelId_lo)
{
    var indexBase = 0;
    for(var nCategory = 0; nCategory < modelId_hi; nCategory++)
    {
        indexBase += this.dvRom.getUint32(RA_OBJECT_MODEL_CATEGORY_COUNTS + nCategory * 4);
    }
    return indexBase + modelId_lo;
}

RoadRash64.parseGeometryPacket = function(dv, packetOffset)
{
    var packet = {
        header: null,
        vertices: [],
        triangles: []
    };

    packet.header = new GeometryPacketHeader(dv, packetOffset);

    var offsVertices = packetOffset + GeometryPacketHeader.SIZE;
    var offsTriangles = offsVertices + packet.header.verticesSize;

    for(var nVertex = 0; nVertex < packet.header.numVertices; nVertex++)
    {
        var vertex = new SPVertex(dv, offsVertices + (nVertex * SPVertex.SIZE));
        packet.vertices.push(vertex);
    }

    for(var nTri = 0; nTri < packet.header.numTriangles; nTri++)
    {
        var tri = new Triangle(dv, offsTriangles + (nTri * Triangle.SIZE));
        packet.triangles.push(tri);
    }

    return packet;
}

RoadRash64.parseTextureFile = function(dvTexture)
{
    // TODO handle animated textures
    var textureHeader = new TextureHeader(dvTexture, 0);
    var texelsOffset = TextureHeader.SIZE;
    var width = textureHeader.width;
    var height = textureHeader.height;

    var bIntensity = !!(textureHeader.flags & 0x8000);

    var data = null;

    if(textureHeader.bitDepth == 4)
    {
        if(bIntensity)
        {
            data = rgba32_texture_from_i4(dvTexture, texelsOffset, width, height);
        }
        else
        {
            var tlutOffset = texelsOffset + (width * height) / 2;
            data = rgba32_texture_from_ci4(dvTexture, texelsOffset, tlutOffset, width, height);
        }
    }
    else if(textureHeader.bitDepth == 8)
    {
        if(bIntensity)
        {
            data = rgba32_texture_from_i8(dvTexture, texelsOffset, width, height);
        }
        else
        {
            var tlutOffset = texelsOffset + (width * height);
            data = rgba32_texture_from_ci8(dvTexture, texelsOffset, tlutOffset, width, height);
        }
    }
    else
    {
        return null;
    }

    return { data: data, width: width, height: height, flags: textureHeader.flags, header: textureHeader };
}

// Structures

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

function DataReference(dv, offset)
{
    this.offset = dv.getUint32(offset + 0x00);
    this.size = dv.getUint32(offset + 0x04);
    this.pointer = dv.getUint32(offset + 0x08);
}

DataReference.SIZE = 0x0C;

function TextureHeader(dv, offset)
{
    this.signature = dv.getUint32(offset + 0x00); // SIG_TEXTURE (0x16) or SIG_ANIM_TEXTURE (0x17)
    this.textureFileSize = dv.getUint32(offset + 0x04);
    this.unk08 = dv.getUint32(offset + 0x08); // always FFFFFFFF
    this.fileName = dvgetstr(dv, offset + 0x0C);
    this.numFrames = dv.getUint16(offset + 0x20); // usually 1, 2+ if animated
    this.paletteSize = dv.getUint16(offset + 0x22);
    this.flags = dv.getUint16(offset + 0x24);   // 0x4000 = need alpha?, 0x0014 = ?
    this.texelsSize = dv.getUint16(offset + 0x26);
    this.unk28 = dv.getFloat32(offset + 0x28);  // animation interval?
    this.width = dv.getUint32(offset + 0x2C);
    this.height = dv.getUint32(offset + 0x30);
    this.bitDepth = dv.getUint32(offset + 0x34); // 4 = i4/ci4, 8 = i8/ci8
    this.unk38 = dv.getUint32(offset + 0x38);  // always 0
    this.unk3C = dv.getUint32(offset + 0x3C);  // points to last 0x40 bytes padding bytes of file?
}

TextureHeader.SIZE = 0x40;

function MapPartitionHeader(dv, offset)
{
    this.signature = dv.getUint32(offset + 0x00); // SIG_MAP_PARTITION (0x3F)
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

function MapSubMeshHeader(dv, offset)
{
    this.signature   = dv.getUint32(offset + 0x00); // SIG_MAP_SUBMESH (0x3D)
    this.size        = dv.getUint32(offset + 0x04);
    this.unk08       = dv.getUint32(offset + 0x08);
    this.numPackets  = dv.getUint16(offset + 0x0C);
    this.numPackets2 = dv.getUint16(offset + 0x0E); // always the same as numPackets?
    this.unk10       = dv.getUint16(offset + 0x10);
    this.textureFileIndex = dv.getUint16(offset + 0x12); // texture file index
    this.unk14       = dv.getUint32(offset + 0x14);
}

MapSubMeshHeader.SIZE = 0x18;

function GeometryPacketHeader(dv, offset)
{
    this.numTriangles = dv.getUint16(offset + 0x00);
    this.numVertices  = dv.getUint16(offset + 0x02);
    this.packetSize   = dv.getUint16(offset + 0x04);
    this.verticesSize = dv.getUint16(offset + 0x06);
}

GeometryPacketHeader.SIZE = 8;

function ObjectModelHeader(dv, offset)
{
    this.signature = dv.getUint32(offset + 0x00); // SIG_OBJECT_MODEL (0x41)
    this.size = dv.getUint32(offset + 0x04);
    this.unk08 = dv.getUint32(offset + 0x08);
    this.unk0C = dv.getUint32(offset + 0x0C);
    // u8 unk10[0x30] padding?
    this.unk40 = dv.getUint32(offset + 0x40);
    this.offsRootNode = dv.getUint32(offset + 0x44); // + 0x40 = offset of graph commands
    // u8 unk48[0x18] padding?
    this.numTextures = dv.getUint32(offset + 0x60);
    this.unk64 = dv.getUint32(offset + 0x64);
}

ObjectModelHeader.SIZE = 0x68;

function ModelNode13(dv, offset)
{
    this.signature = dv.getUint32(offset + 0x00); // (0x13)
    this.size = dv.getUint32(offset + 0x04);
    this.marker = dv.getUint32(offset + 0x08);
    this.numChildren = dv.getUint16(offset + 0x0C);
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

ModelNode13.SIZE = 0x40;

function ModelNode12(dv, offset)
{
    this.signature = dv.getUint32(offset + 0x00); // (0x12)
    this.size = dv.getUint32(offset + 0x04);
    this.marker = dv.getUint32(offset + 0x08);
    this.unk0C = dv.getUint32(offset + 0x0C); // looks like padding
    this.numChildren = dv.getUint16(offset + 0x10);
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

ModelNode12.SIZE = 0x58;

function ModelNode11(dv, offset)
{
    this.signature = dv.getUint32(offset + 0x00); // (0x11)
    this.size = dv.getUint32(offset + 0x04);
    this.marker = dv.getUint32(offset + 0x08);
    this.numChildren = dv.getUint16(offset + 0x0C);
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

ModelNode11.SIZE = 0x38;

function ModelNode10(dv, offset)
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

ModelNode10.SIZE = 0x28;

//////////////////

function ItemPlacement(dv, offset)
{
    this.x = dv.getFloat32(offset + 0x00);
    this.y = dv.getFloat32(offset + 0x04);
    this.z = dv.getFloat32(offset + 0x08);
    this.itemId = dv.getFloat32(offset + 0x0C); // not sure why this is a float
}

ItemPlacement.SIZE = 0x10;

function ObjectPlacement(dv, offset)
{
    // quaternion
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

function Triangle(dv, offset)
{
    var data = dv.getUint16(offset);
    this.v0 = (data >> 10) & 0x1F;
    this.v1 = (data >>  5) & 0x1F;
    this.v2 = (data >>  0) & 0x1F;
}

Triangle.SIZE = 0x02;

function CollisionHeader(dv, offset)
{
    this.signature = dv.getUint32(offset + 0x00); // SIG_COLLISION (0x3C)
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
    this.surfaceTypeId = dv.getUint8(offset + 0x02);
    this.numTriangles = dv.getUint8(offset + 0x03);
}

CollisionTriangleListHeader.SIZE = 0x04;
