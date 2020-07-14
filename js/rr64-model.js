function RR64Model(dv, bDebug)
{
    this.dv = dv;
    var header = new ModelHeader(dv, 0x00);

    this.positions = [];
    this.colors = [];
    this.uvs = [];
    this.indices = [];

    this.groups = {};

    this.textureFileIndices= {};
    this.textures = [];
    this.materials = [];

    // collect textures
    for(var i = 0; i < header.numTextures; i++)
    {
        var offsRef = ModelHeader.SIZE + (i * Reference.SIZE);
        var reference = new Reference(dv, offsRef);
        var offsTextureFile = offsRef + reference.offset;

        this.textureFileIndices[offsTextureFile] = i;
        var dvTexture = dvpart(this.dv, offsTextureFile, reference.size);
        this.textures[i] = this.loadTexture(dvTexture);

        //console.log(textureHeader.fileName);
        // todo handle 0x16/0x17 texture file
    }

    var offset = 0x40 + header.offsCommands;
    this.processNode(offset);

    //for(var texIndex in groups)
    //{
    //    
    //}
}

RR64Model.prototype.processNode = function(offset)
{
    var cmdSig = this.dv.getUint32(offset);

    switch(cmdSig)
    {
    case 0x13: this.processNode13(offset); break;
    case 0x12: this.processNode12(offset); break;
    case 0x11: this.processNode11(offset); break;
    case 0x10: this.processNode10(offset); break;
    default: throw new Error('shit');
    }
}

RR64Model.prototype.processNode13 = function(offset)
{
    var node = new Node13(this.dv, offset);
    var offsRefTable = offset + Node13.SIZE;

    //console.log(offset.hex(), 'node13', JSON.stringify(node));

    for(var i = 0; i < node.numReferences; i++)
    {
        var offsRef = offsRefTable + Reference.SIZE * i;
        var reference = new Reference(this.dv, offsRef);

        var offsCmd = offsRef + reference.offset;
        this.processNode(offsCmd);
    }
}

RR64Model.prototype.processNode12 = function(offset)
{
    var node = new Node12(this.dv, offset);

    // todo what are these structs for (animation?)
    var offsStructsA = offset + Node12.SIZE;
    var offsStructsB = offsStructsA + (node.numUnkStructsA * 0x18);
    var offsRefTable = offsStructsB + (node.numUnkStructsB * 0x10);

    //console.log('    ' + offset.hex(), 'node12', JSON.stringify(node));

    for(var i = 0; i < node.numReferences; i++)
    {
        var offsRef = offsRefTable + Reference.SIZE * i
        var reference = new Reference(this.dv, offsRef);
        var offsCmd = (offsRef + reference.offset) & 0xFFFF;
        this.processNode(offsCmd);
    }
    
}

RR64Model.prototype.processNode11 = function(offset)
{
    var node = new Node11(this.dv, offset);
    var offsRefTable = offset + Node11.SIZE;

    //console.log('        ' + offset.hex(), 'node11', JSON.stringify(node));

    for(var i = 0; i < node.numReferences; i++)
    {
        var offsRef = offsRefTable + Reference.SIZE * i
        var reference = new Reference(this.dv, offsRef);
        
        var offsCmd = offsRef + reference.offset;
        this.processNode(offsCmd);
    }
}

RR64Model.prototype.processNode10 = function(offset)
{
    var node = new Node10(this.dv, offset);
    var packetOffset = offset + Node10.SIZE;
    var dv = this.dv;

    var texIndex = this.textureFileIndices[offset - node.offsTextureFile * 8];
    var textureInfo = this.textures[texIndex];
    var texWidth = textureInfo.width;
    var texHeight = textureInfo.height;

    if(!this.groups[texIndex])
    {
        this.groups[texIndex] = {
            positions: [],
            uvs: [],
            colors: [],
            indices: []
        };
    }

    var group = this.groups[texIndex];

    // todo clean up code reuse
    for(var nPacket = 0; nPacket < node.numPackets; nPacket++)
    {
        var indexBase = group.positions.length / 3;
        var packetHeader = new SubMeshPacketHeader(dv, packetOffset);

        //console.log('                ' + packetOffset.hex(), packetHeader);

        var verticesOffset = packetOffset + SubMeshPacketHeader.SIZE;
        var trianglesOffset = verticesOffset + packetHeader.verticesSize;

        for(var nVertex = 0; nVertex < packetHeader.numVertices; nVertex++)
        {
            var offsVertex = verticesOffset + (nVertex * 16);
            var vertex = new SPVertex(dv, offsVertex);

            group.positions.push(-(vertex.x), vertex.z, vertex.y);
            group.colors.push(vertex.r / 0xFF, vertex.g / 0xFF, vertex.b / 0xFF);
            group.uvs.push((vertex.s / 32) / texWidth / 2, (vertex.t / 32) / texHeight / 2);
        }

        for(var nTri = 0; nTri < packetHeader.numTriangles; nTri++)
        {
            var offsTri = trianglesOffset + (nTri * 2);
            var tri = dv.getUint16(offsTri);
            var v0 = (tri >> 10) & 0x1F;
            var v1 = (tri >>  5) & 0x1F;
            var v2 = (tri >>  0) & 0x1F;
            group.indices.push(indexBase + v0, indexBase + v1, indexBase + v2);
            //console.log(indexBase, v0, v1, v2);
        }

        packetOffset += packetHeader.packetSize;
    }
}

// todo cleanup repeated code
RR64Model.prototype.loadTexture = function(dvTexture)
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