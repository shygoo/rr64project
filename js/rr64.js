// in RAM: 8018E480 static file table, 801B2840 active file table
// file system header: 0000003E 00DDF0C0 00000000 0001 1170 03E8 1324 039E 0346
// entries 0x0000 through 0x0404 are texture files
// entries 0x0405+ are mesh files

const RA_MODEL_CATEGORY_INDICES = 0x000A8334;

const RA_UNK_FILE = 0x000AA4C0;
const RA_PATH_DATA = RA_UNK_FILE + 0x418;
const NUM_PATH_POINTS = 3053;

const RA_MAP_MODEL_TABLE = 0x0018D380; 
const NUM_MAP_MODELS = 0x16C2;

// 0101D440: 00000040 00248800 00000001 00000175 // (175 = number of models)
const RA_MODEL_TABLE_HEADER = 0x0101D440;
const RA_MODEL_TABLE = 0x0101D480;
const NUM_MODELS = 0x175;

const RA_OBJECT_PLACEMENT_TABLE = 0x01265C50;
const NUM_PLACEMENT_FILES = 4900; // is this correct?

const RA_OBJECT_DEFINITION_TABLE = 0x01303208;
const NUM_OBJECT_DEFINITIONS = 0x127; // todo use header

const RA_ITEM_COUNT = 0x01304DC0;
const RA_ITEM_TABLE = 0x01304DC4;

const RA_RACE_TABLE = 0x000B67C4;
const NUM_RACES = 58;

// TODO these are part of a larger collection of textures referenced by the table at 0x01E09368, should eventually use that instead
const RA_ITEM_TEXTURES = 0x01F49730;
const NUM_ITEM_TEXTURES = 16;
const ITEM_TEX_INDICES = [ // todo where is this defined?
    null,
    0x0D, 0x0E, 0x0F, 0x0C, 0x06, 0x00, 0x02, 0x05,
    0x09, 0x08, 0x01, 0x03, 0x0B, 0x0A, 0x07, 0x04
];

const SIG_TEXTURE      = 0x00000016;
const SIG_ANIM_TEXTURE = 0x00000017;
const SIG_SUBMESH      = 0x0000003D;
const SIG_FILE_TABLE   = 0x0000003E;
const SIG_MESH         = 0x0000003F;

const TEX_FMT_CI4      = 0x04;
const TEX_FMT_CI8      = 0x08;

///////////////////

function RoadRash64(dvRom)
{
    this.dvRom = dvRom;

    this.mapTextures = this.parseMapTextures();
    this.mapModels = this.parseMapModels();
    this.objectDefinitions = this.parseObjectDefinitions();
    this.objectModels = this.parseObjectModels();
    this.objectPlacements = this.parseObjectPlacements();
    this.itemTextures = this.parseItemTextures();
    this.itemPlacements = this.parseItemPlacements();
}

RoadRash64.prototype.parseMapTextures = function()
{
    var mapTextures = [];

    // note: map textures and models share the same table
    for(var i = 0; i < NUM_MAP_MODELS; i++)
    {
        // 0x18 = file system header size
        var entryOffset = RA_MAP_MODEL_TABLE + 0x18 + (i * FileEntry.SIZE);
        var fileEntry = new FileEntry(this.dvRom, entryOffset)

        if(fileEntry.offset == 0)
        {
            mapTextures.push(null);
            continue;
        }

        var fileAddress = fileEntry.offset + entryOffset;
        var signature = this.dvRom.getUint32(fileAddress + 0x00);
        var dvFile = dvpart(this.dvRom, fileAddress, fileEntry.size)

        if(signature == SIG_TEXTURE || signature == SIG_ANIM_TEXTURE)
        {
            var textureFile = this.parseTextureFile(dvFile);
            mapTextures.push(textureFile);
        }
        else
        {
            mapTextures.push(null);
        }
    }

    return mapTextures;
}

RoadRash64.prototype.parseMapModels = function()
{
    var mapModels = [];

    // note: map textures and models share the same table
    for(var i = 0; i < NUM_MAP_MODELS; i++)
    {
        // 0x18 = file system header size
        var entryOffset = RA_MAP_MODEL_TABLE + 0x18 + (i * FileEntry.SIZE);
        var fileEntry = new FileEntry(this.dvRom, entryOffset)

        if(fileEntry.offset == 0)
        {
            continue;
        }

        var fileAddress = fileEntry.offset + entryOffset;
        var signature = this.dvRom.getUint32(fileAddress + 0x00);
        var dvFile = dvpart(this.dvRom, fileAddress, fileEntry.size)

        if(signature == SIG_MESH) // mesh file
        {
            var mapModel = this.parseMapMesh(dvFile);
            mapModels.push(mapModel);
        }
    }

    return mapModels;
}

RoadRash64.prototype.parseObjectDefinitions = function()
{
    var objectDefinitions = [];

    for(var nObjectDef = 0; nObjectDef < NUM_OBJECT_DEFINITIONS; nObjectDef++)
    {
        var objectDef = new ObjectDefinition(this.dvRom, RA_OBJECT_DEFINITION_TABLE + nObjectDef * ObjectDefinition.SIZE);
        objectDefinitions.push(objectDef);
    }

    return objectDefinitions;
}

RoadRash64.prototype.parseObjectModels = function()
{
    var objectModels = [];

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
            objectPlacements.push(placement); // todo should probably subarray each file
        }
    }

    return objectPlacements;
}

RoadRash64.prototype.parseItemTextures = function()
{
    var itemTextures = [];

    for(var nTexture = 0; nTexture < NUM_ITEM_TEXTURES; nTexture++)
    {
        var raTexture = RA_ITEM_TEXTURES + nTexture * 0x1000;
        var data = rgba32_texture_from_i8(this.dvRom, raTexture, 64, 64);
        itemTextures.push(data);
    }

    return itemTextures;
}

RoadRash64.prototype.parseItemPlacements = function()
{
    var itemPlacements = [];

    var numItems = this.dvRom.getUint32(RA_ITEM_COUNT);
    
    for(var nItem = 0; nItem < numItems; nItem++)
    {
        var raItem = RA_ITEM_TABLE + nItem * Item.SIZE;
        var item = new Item(this.dvRom, raItem);
        itemPlacements.push(item);
    }

    return itemPlacements;
}

RoadRash64.prototype.parseMapMesh = function(dvMesh)
{
    var subMeshes = [];

    var meshHeader = new MeshHeader(dvMesh, 0);
    
    for(var nSubMesh = 0; nSubMesh < meshHeader.numSubMeshes; nSubMesh++)
    {
        var subMesh = {
            info: null,
            header: null,
            geometryPackets: []
        };

        var entryOffset = 0xF0 + (nSubMesh * 12);
        var subMeshInfo = new SubMeshInfo(dvMesh, entryOffset);
        var subMeshOffset = subMeshInfo.subMeshOffset + entryOffset;
        var subMeshHeader = new SubMeshHeader(dvMesh, subMeshOffset);

        subMesh.info = subMeshInfo;
        subMesh.header = subMeshHeader;

        var packetOffset = subMeshOffset + SubMeshHeader.SIZE;

        for(var nPacket = 0; nPacket < subMeshHeader.numPackets; nPacket++)
        {
            var packet = this.parseGeometryPacket(dvMesh, packetOffset);
            packetOffset += packet.header.packetSize;

            subMesh.geometryPackets.push(packet);
        }

        subMeshes.push(subMesh);
    }

    return subMeshes;

    // collision
    // todo optimize

    //var collisionGeometry = new THREE.BufferGeometry();
    //var collisionPositions = [];
    //var collisionColors = [];
//
    //const surfaceTypeColors = [
    //    /*00*/ null,
    //    /*01*/ [1, 0, 0],
    //    /*02*/ [0, 1, 0],
    //    /*03*/ [0, 0, 1],
    //    /*04*/ [1, 1, 0],
    //    /*05*/ [1, 0, 1],
    //    /*06*/ [0, 1, 1],
    //    /*07*/ [1, 1, 1],
    //    /*08*/ [0.5, 0, 0],
    //    /*09*/ [0, 0.5, 0],
    //    /*0A*/ [0, 0, 0.5],
    //    /*0B*/ [0.5, 0.5, 0],
    //    /*0C*/ [0.5, 0, 0.5],
    //    /*0D*/ [0, 0.5, 0.5],
    //    /*0E*/ [0.5, 0.5, 0.5]
    //];
//
    //var collisionHeader = new CollisionHeader(dvMesh, meshHeader.offsCollision);
    //for(var nGroup = 0; nGroup < collisionHeader.numGroups; nGroup++)
    //{
    //    var offsCollisionGroup = dvMesh.getUint16(meshHeader.offsCollision + CollisionHeader.SIZE + nGroup * 2);
    //    var groupHeader = new CollisionGroupHeader(dvMesh, meshHeader.offsCollision + offsCollisionGroup);
    //    var offsTriangleList = meshHeader.offsCollision + offsCollisionGroup + CollisionGroupHeader.SIZE;
//
    //    for(var nList = 0; nList < groupHeader.numTriangleLists; nList++)
    //    {
    //        var triangleListHeader = new CollisionTriangleListHeader(dvMesh, offsTriangleList);
    //        offsTriangleList += CollisionTriangleListHeader.SIZE;
//
    //        var color = surfaceTypeColors[triangleListHeader.attributeId];
//
    //        for(var nTri = 0; nTri < triangleListHeader.numTriangles; nTri++)
    //        {
    //            var tri = new Triangle(dvMesh, offsTriangleList);
    //            offsTriangleList += Triangle.SIZE;
//
    //            var vertex0 = new SPVertex(dvMesh, triangleListHeader.offsVertices + tri.v0 * SPVertex.SIZE);
    //            var vertex1 = new SPVertex(dvMesh, triangleListHeader.offsVertices + tri.v1 * SPVertex.SIZE);
    //            var vertex2 = new SPVertex(dvMesh, triangleListHeader.offsVertices + tri.v2 * SPVertex.SIZE);
//
    //            
//
    //            collisionPositions.push(-(meshHeader.worldX + vertex0.x), (meshHeader.worldZ + vertex0.z) / 2, (meshHeader.worldY + vertex0.y));
    //            collisionPositions.push(-(meshHeader.worldX + vertex1.x), (meshHeader.worldZ + vertex1.z) / 2, (meshHeader.worldY + vertex1.y));
    //            collisionPositions.push(-(meshHeader.worldX + vertex2.x), (meshHeader.worldZ + vertex2.z) / 2, (meshHeader.worldY + vertex2.y));
//
    //            collisionColors.push(color[0], color[1], color[2]);
    //            collisionColors.push(color[0], color[1], color[2]);
    //            collisionColors.push(color[0], color[1], color[2]);
    //        }
//
    //        if((offsTriangleList % 4) != 0) offsTriangleList += 2;
    //    }
    //}
//
    //var fCollisionPositions = new Float32Array(collisionPositions);
    //var fCollisionColors = new Float32Array(collisionColors);
    //collisionGeometry.setAttribute('position', new THREE.BufferAttribute(fCollisionPositions, 3));
    //collisionGeometry.setAttribute('color', new THREE.BufferAttribute(fCollisionColors, 3));
    //var material = new THREE.MeshBasicMaterial({ wireframe: true, vertexColors: THREE.VertexColors });
    //var collisionMesh = new THREE.Mesh(collisionGeometry, material);
    //this.sceneAdd('collision', [ collisionMesh ]);
}

RoadRash64.prototype.parseTextureFile = function(dvTexture)
{
    // TODO handle animated textures
    var textureHeader = new TextureHeader(dvTexture, 0);
    var ciOffset = TextureHeader.SIZE;
    var width = textureHeader.width;
    var height = textureHeader.height;

    var data = null;

    if(textureHeader.format == TEX_FMT_CI4)
    {
        var tlutOffset = ciOffset + (width * height) / 2;
        data = rgba32_texture_from_ci4(dvTexture, ciOffset, tlutOffset, width, height);
    }
    else if(textureHeader.format == TEX_FMT_CI8)
    {
        var tlutOffset = ciOffset + (width * height);
        data = rgba32_texture_from_ci8(dvTexture, ciOffset, tlutOffset, width, height);
    }
    else
    {
        return null;
    }

    return { data: data, width: width, height: height, flags: textureHeader.unk24 };
}

RoadRash64.prototype.getModelIndex = function(modelId_hi, modelId_lo)
{
    var indexBase = 0;
    for(var i = 0; i < modelId_hi; i++)
    {
        indexBase += this.dvRom.getUint32(RA_MODEL_CATEGORY_INDICES + i * 4);
    }

    return indexBase + modelId_lo;
}

RoadRash64.prototype.parseGeometryPacket = function(dv, packetOffset)
{
    var packet = {
        header: null,
        vertices: [],
        triangles: []
    };

    packet.header = new SubMeshPacketHeader(dv, packetOffset);
    //packet.header = packetHeader

    var offsVertices = packetOffset + SubMeshPacketHeader.SIZE;
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

//////////////

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