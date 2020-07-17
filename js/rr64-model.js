function RR64ObjectModel(dv)
{
    this.dv = dv;
    this.header = new ObjectModelHeader(dv, 0x00);
    this.textures = [];
    this._textureFileIndices = {};
    
    for(var nTexture = 0; nTexture < this.header.numTextures; nTexture++)
    {
        var offsRef = ObjectModelHeader.SIZE + (nTexture * DataReference.SIZE);
        var reference = new DataReference(dv, offsRef);
        var offsTextureFile = offsRef + reference.offset;

        var dvTexture = dvpart(this.dv, offsTextureFile, reference.size);
        var textureFile = RoadRash64.parseTextureFile(dvTexture);
        this.textures.push(textureFile);

        this._textureFileIndices[offsTextureFile] = nTexture;
    }

    this.rootNode = this._parseNode(0x40 + this.header.offsRootNode);
}

RR64ObjectModel.prototype.traverseNodes = function(callback)
{
    this._traverseNodes(this.rootNode, callback);
}

RR64ObjectModel.prototype._traverseNodes = function(node, callback)
{
    callback(node);

    if(node.children)
    {
        node.children.forEach(childNode => {
            callback(childNode);
            this._traverseNodes(childNode, callback);
        });
    }
}

RR64ObjectModel.prototype._parseNode = function(nodeOffset)
{
    var signature = this.dv.getUint32(nodeOffset);

    switch(signature)
    {
    case SIG_MODEL_NODE_13: return this._parseNode13(nodeOffset);
    case SIG_MODEL_NODE_12: return this._parseNode12(nodeOffset);
    case SIG_MODEL_NODE_11: return this._parseNode11(nodeOffset);
    case SIG_MODEL_NODE_10: return this._parseNode10(nodeOffset);
    default:
        throw new Error('unhandled model node type');
    }
}

RR64ObjectModel.prototype._parseNode13 = function(nodeOffset)
{
    var node = new ModelNode13(this.dv, nodeOffset);
    var offsRefTable = nodeOffset + ModelNode13.SIZE;
    var children = [];

    for(var nChild = 0; nChild < node.numChildren; nChild++)
    {
        var offsRef = offsRefTable + DataReference.SIZE * nChild;
        var reference = new DataReference(this.dv, offsRef);

        var offsCmd = offsRef + reference.offset;
        children.push(this._parseNode(offsCmd));
    }

    return { node: node, children: children };
}

RR64ObjectModel.prototype._parseNode12 = function(nodeOffset)
{
    var node = new ModelNode12(this.dv, nodeOffset);
    var children = [];

    // todo what are these structs for (animation?)
    var offsStructsA = nodeOffset + ModelNode12.SIZE;
    var offsStructsB = offsStructsA + (node.numUnkStructsA * 0x18);
    var offsRefTable = offsStructsB + (node.numUnkStructsB * 0x10);

    for(var nChild = 0; nChild < node.numChildren; nChild++)
    {
        var offsRef = offsRefTable + DataReference.SIZE * nChild
        var reference = new DataReference(this.dv, offsRef);
        var offsCmd = (offsRef + reference.offset) & 0xFFFF;
        children.push(this._parseNode(offsCmd));
    }
    
    return { node: node, children: children };
}

RR64ObjectModel.prototype._parseNode11 = function(nodeOffset)
{
    var node = new ModelNode11(this.dv, nodeOffset);
    var offsRefTable = nodeOffset + ModelNode11.SIZE;
    var children = [];

    for(var nChild = 0; nChild < node.numChildren; nChild++)
    {
        var offsRef = offsRefTable + DataReference.SIZE * nChild
        var reference = new DataReference(this.dv, offsRef);
        
        var offsCmd = offsRef + reference.offset;
        children.push(this._parseNode(offsCmd));
    }

    return { node: node, children: children };
}

RR64ObjectModel.prototype._parseNode10 = function(nodeOffset)
{
    var node = new ModelNode10(this.dv, nodeOffset);
    var texIndex = this._textureFileIndices[nodeOffset - node.offsTextureFile * 8];
    var geometryPackets = [];

    var packetOffset = nodeOffset + ModelNode10.SIZE;

    for(var nPacket = 0; nPacket < node.numPackets; nPacket++)
    {
        var packet = RoadRash64.parseGeometryPacket(this.dv, packetOffset);
        geometryPackets.push(packet);
        packetOffset += packet.header.packetSize;
    }

    return { node: node, texIndex: texIndex, geometryPackets: geometryPackets };
}
