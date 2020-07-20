const RR64ToTHREE = {};

RR64ToTHREE.createMapMesh = function(rr64)
{
    var mapMaterials = [];
    var mapGroups = {};
    var mapPositions = [];
    var mapColors = [];
    var mapUVs = [];
    var mapIndices = [];

    var mapGeometry = new THREE.BufferGeometry();

    var defaultMaterial = new THREE.MeshBasicMaterial({
        color: 0xFF0000,
        side: THREE.DoubleSide,
    });

    // build map material array
    for(var nMapTexture in rr64.mapTextures)
    {
        if(typeof rr64.mapTextures[nMapTexture] == 'undefined')
        {
            mapMaterials.push(defaultMaterial);
            continue;
        }

        var textureFile = rr64.mapTextures[nMapTexture];

        var dataTexture = new THREE.DataTexture(
            textureFile.data,
            textureFile.width,
            textureFile.height,
            THREE.RGBAFormat);

        dataTexture.wrapS = THREE.RepeatWrapping;
        dataTexture.wrapT = THREE.RepeatWrapping;
        dataTexture.magFilter = THREE.LinearFilter;

        var material = new THREE.MeshBasicMaterial({
            vertexColors: THREE.VertexColors,
            side: THREE.BackSide,
            polygonOffset: true,
            polygonOffsetFactor: 1,
            polygonOffsetUnits: 1,
            map: dataTexture,
            transparent: !!(textureFile.flags & 0x4000),
            alphaTest: 0.3
        });

        mapMaterials.push(material);
    }

    // build map mesh, sort submeshes with similar materials into groups
    for(var nMapPartition in rr64.mapPartitions)
    {
        var mapPartition = rr64.mapPartitions[nMapPartition];

        var worldX = mapPartition.header.worldX;
        var worldY = mapPartition.header.worldY;
        var worldZ = mapPartition.header.worldZ;

        for(var nSubMesh in mapPartition.subMeshes)
        {
            var subMesh = mapPartition.subMeshes[nSubMesh];
            var textureFile = rr64.mapTextures[subMesh.header.textureFileIndex];

            if(!textureFile)
            {
                console.log("texture undefined; nMapPartition:", nMapPartition, "nSubMesh:", nSubMesh);
            }

            var texWidth = textureFile ? textureFile.width : 1;
            var texHeight = textureFile ? textureFile.height : 1;

            if(typeof mapGroups[subMesh.header.textureFileIndex] == 'undefined')
            {
                mapGroups[subMesh.header.textureFileIndex] = {
                    positions: [],
                    uvs: [],
                    colors: [],
                    indices: []
                };
            }

            var group = mapGroups[subMesh.header.textureFileIndex];

            subMesh.geometryPackets.forEach(packet => {
                var groupIndexBase = group.positions.length / 3;

                packet.vertices.forEach(vertex => {
                    group.positions.push(-(vertex.x + worldX), (vertex.z + worldZ) / 2, (vertex.y + worldY));
                    group.colors.push(vertex.r / 0xFF, vertex.g / 0xFF, vertex.b / 0xFF);
                    group.uvs.push((vertex.s / 32) / texWidth / 2, (vertex.t / 32) / texHeight / 2);
                });

                packet.triangles.forEach(triangle => {
                    group.indices.push(groupIndexBase + triangle.v0, groupIndexBase + triangle.v1, groupIndexBase + triangle.v2);
                });
            });
        }
    }

    // flatten groups
    for(var materialIndex in mapGroups)
    {
        var group = mapGroups[materialIndex];
        var start = mapIndices.length;
        var count = group.indices.length;

        var indexBase = mapPositions.length / 3;

        group.positions.forEach(n => mapPositions.push(n));
        group.colors.forEach(n => mapColors.push(n));
        group.uvs.forEach(n => mapUVs.push(n));
        group.indices.forEach(n => mapIndices.push(indexBase + n));

        mapGeometry.addGroup(start, count, materialIndex);
    }

    var fMapPositions = new Float32Array(mapPositions);
    var fMapColors = new Float32Array(mapColors);
    var fMapUVs = new Float32Array(mapUVs);
    
    mapGeometry.setAttribute('position', new THREE.BufferAttribute(fMapPositions, 3));
    mapGeometry.setAttribute('color', new THREE.BufferAttribute(fMapColors, 3));
    mapGeometry.setAttribute('uv', new THREE.BufferAttribute(fMapUVs, 2));
    mapGeometry.setIndex(mapIndices);

    return new THREE.Mesh(mapGeometry, mapMaterials);
}

RR64ToTHREE.createMapCollisionMesh = function(rr64)
{
    const surfaceTypeColors = [
        /*00*/ null,
        /*01*/ [0.5, 0.5, 0.5], // most buildings
        /*02*/ [0.5, 0.0, 0.5], // fences A
        /*03*/ [0.0, 0.5, 0.5], // fences B / some buildings
        /*04*/ [0.5, 0.5, 0.0], // fences C
        /*05*/ [1.0, 1.0, 1.0], // pavement/default
        /*06*/ [0.8, 0.4, 0.0], // dirt shoulder
        /*07*/ [0.5, 1.0, 0.5], // grass shoulder
        /*08*/ [0.8, 0.8, 0.8], // gravel shoulder
        /*09*/ [0.5, 0.4, 0.2], // off-road sand/shoreline
        /*0A*/ [0.0, 0.5, 0.0], // off-road grass
        /*0B*/ [0.5, 0.5, 0.0], // off-road dirt
        /*0C*/ [1.0, 1.0, 0.5], // treeline wall
        /*0D*/ [0.0, 0.0, 1.0], // water
        /*0E*/ [1.0, 0.5, 0.0]  // dirt road
    ];

    var mapCollisionPositions = [];
    var mapCollisionColors = [];
    var mapCollisionGeometry = new THREE.BufferGeometry(); 

    for(var nMapPartition in rr64.mapPartitions)
    {
        var mapPartition = rr64.mapPartitions[nMapPartition];
        var worldX = mapPartition.header.worldX;
        var worldY = mapPartition.header.worldY;
        var worldZ = mapPartition.header.worldZ;

        mapPartition.collision.forEach(collisionGroup => {
            collisionGroup.forEach(triangleList =>
            {
                var color = surfaceTypeColors[triangleList.surfaceTypeId];
                var subMesh = mapPartition.subMeshes[triangleList.nSubMesh];
                var packet = subMesh.geometryPackets[triangleList.nPacket];
                triangleList.triangles.forEach(triangle => {
                    // unoptimized
                    var vertex0 = packet.vertices[triangle.v0];
                    var vertex1 = packet.vertices[triangle.v1];
                    var vertex2 = packet.vertices[triangle.v2];

                    mapCollisionColors.push(color[0], color[1], color[2]);
                    mapCollisionColors.push(color[0], color[1], color[2]);
                    mapCollisionColors.push(color[0], color[1], color[2]);

                    mapCollisionPositions.push(-(vertex0.x + worldX), (vertex0.z + worldZ) / 2, (vertex0.y + worldY));
                    mapCollisionPositions.push(-(vertex1.x + worldX), (vertex1.z + worldZ) / 2, (vertex1.y + worldY));
                    mapCollisionPositions.push(-(vertex2.x + worldX), (vertex2.z + worldZ) / 2, (vertex2.y + worldY));
                });
            });
        });
    }

    var fMapCollisionPositions = new Float32Array(mapCollisionPositions);
    var fMapCollisionColors = new Float32Array(mapCollisionColors);

    mapCollisionGeometry.setAttribute('position', new THREE.BufferAttribute(fMapCollisionPositions, 3));
    mapCollisionGeometry.setAttribute('color', new THREE.BufferAttribute(fMapCollisionColors, 3));

    var material = new THREE.MeshBasicMaterial({ vertexColors: THREE.VertexColors, side: THREE.DoubleSide, wireframe: true});

    return new THREE.Mesh(mapCollisionGeometry, material);
}

RR64ToTHREE.createPositionedItemSprites = function(rr64)
{
    var materials = [];
    var sprites = [];

    rr64.itemTextures.forEach(data => {
        var dataTexture = new THREE.DataTexture(data, 64, 64, THREE.RGBAFormat);
        var material = new THREE.SpriteMaterial({ map: dataTexture, color: 0xFF0000 });
        materials.push(material);
    });

    rr64.itemPlacements.forEach(item => {
        var sprite = new THREE.Sprite(materials[ITEM_TEX_INDICES[item.itemId]]);
        sprite.position.set(-item.x * 4, item.z * 4, item.y * 4);
        sprite.scale.set(15, 15, 15);
        sprites.push(sprite);
    });

    return sprites;
}

RR64ToTHREE.createPositionedObjectMeshes = function(rr64)
{
    // group placements by model id
    var instances = {};

    for(var nObjectPlacement in rr64.objectPlacements)
    {
        var objectPlacement = rr64.objectPlacements[nObjectPlacement];
        var objectDefinition = rr64.objectDefinitions[objectPlacement.objectIndex];

        var modelIndex = rr64.getModelIndex(objectDefinition.modelId_hi, objectDefinition.modelId_lo);

        if(!instances[modelIndex])
        {
            instances[modelIndex] = [];
        }

        instances[modelIndex].push(objectPlacement);
    }

    var meshes = [];

    for(var modelIndex in instances)
    {
        var objectPlacements = instances[modelIndex];
        var objectModel = rr64.objectModels[modelIndex];

        var instancedMesh = RR64ToTHREE.createInstancedMeshFromObjectModel(objectModel, objectPlacements.length);
        
        for(var nObjectPlacement in objectPlacements)
        {
            var p = objectPlacements[nObjectPlacement];
            var position = new THREE.Vector3(-p.posX * 4, p.posZ * 4, p.posY * 4);
            var quaternion = new THREE.Quaternion(p.qX, p.qZ, p.qY, p.qW);
            var scale = new THREE.Vector3(0.5, 0.5, 0.5);
            var matrix = new THREE.Matrix4();
            matrix.compose(position, quaternion, scale);

            instancedMesh.setMatrixAt(nObjectPlacement, matrix);
        }

        meshes.push(instancedMesh);
    }

    return meshes;
}

RR64ToTHREE.createInstancedMeshFromObjectModel = function(objectModel, count)
{
    var geoAndMats = RR64ToTHREE.createGeometryAndMaterialsFromObjectModel(objectModel); 
    return new THREE.InstancedMesh(geoAndMats.geometry, geoAndMats.materials, count);
}

RR64ToTHREE.createMeshFromObjectModel = function(objectModel, count)
{
    var geoAndMats = RR64ToTHREE.createGeometryAndMaterialsFromObjectModel(objectModel); 
    return new THREE.Mesh(geoAndMats.geometry, geoAndMats.materials);
}

RR64ToTHREE.createGeometryAndMaterialsFromObjectModel = function(objectModel)
{
    var geometry = new THREE.BufferGeometry();
    var groups = [];

    var positions = [];
    var colors = [];
    var uvs = [];
    var indices = [];
    var materials = [];

    for(var texIndex in objectModel.textures)
    {
        var textureFile = objectModel.textures[texIndex];
        
        var dataTexture = new THREE.DataTexture(textureFile.data, textureFile.width, textureFile.height, THREE.RGBAFormat);
        dataTexture.wrapS = THREE.RepeatWrapping;
        dataTexture.wrapT = THREE.RepeatWrapping;
        dataTexture.magFilter = THREE.LinearFilter;
        
        var material = new THREE.MeshBasicMaterial({
            side: THREE.BackSide,
            polygonOffset: true,
            polygonOffsetFactor: 1,
            polygonOffsetUnits: 1,
            map: dataTexture,
            transparent: !!(textureFile.flags & 0x4000)
        });

        if(material.transparent)
        {
            material.alphaTest = 0.3;
        }
        
        materials.push(material);
    }

    objectModel.traverseNodes(node => {
        if(node.node.signature != 0x10)
        {
            return;
        }

        var texIndex = node.texIndex;
        var textureFile = objectModel.textures[texIndex];
        var texWidth = textureFile ? textureFile.width : 1;
        var texHeight = textureFile ? textureFile.height : 1;

        if(typeof groups[texIndex] == 'undefined')
        {
            groups[texIndex] = {
                positions: [],
                uvs: [],
                colors: [],
                indices: []
            };
        }

        var group = groups[texIndex];

        node.geometryPackets.forEach(packet => {
            var groupIndexBase = group.positions.length / 3;

            packet.vertices.forEach(vertex => {
                group.positions.push(-(vertex.x), (vertex.z), (vertex.y));
                group.uvs.push((vertex.s / 32) / texWidth / 2, (vertex.t / 32) / texHeight / 2);
                // todo normals
            });

            packet.triangles.forEach(triangle => {
                group.indices.push(groupIndexBase + triangle.v0, groupIndexBase + triangle.v1, groupIndexBase + triangle.v2);
            });
        });
    });

    // flatten groups
    for(var texIndex in groups)
    {
        var group = groups[texIndex];
        var start = indices.length;
        var numTriangles = group.indices.length;
        var indexBase = positions.length / 3;

        group.positions.forEach(n => positions.push(n));
        group.colors.forEach(n => colors.push(n));
        group.uvs.forEach(n => uvs.push(n));
        group.indices.forEach(n => indices.push(indexBase + n));

        geometry.addGroup(start, numTriangles, texIndex);
    }
    
    var fPositions = new Float32Array(positions);
    var fUVs = new Float32Array(uvs);

    geometry.setAttribute('position', new THREE.BufferAttribute(fPositions, 3));
    geometry.setAttribute('uv', new THREE.BufferAttribute(fUVs, 2));
    geometry.setIndex(indices);

    return { geometry: geometry, materials: materials };
}
