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

        var dataTextures = [];

        textureFile.frames.forEach(frameData =>
        {
            var dataTexture = new THREE.DataTexture(
                frameData,
                textureFile.width,
                textureFile.height,
                THREE.RGBAFormat);

            dataTexture.wrapS = THREE.RepeatWrapping;
            dataTexture.wrapT = THREE.RepeatWrapping;
            dataTexture.magFilter = THREE.LinearFilter;
            dataTexture.minFilter = THREE.LinearFilter;

            dataTextures.push(dataTexture);
        });

        var material = new THREE.MeshBasicMaterial({
            vertexColors: THREE.VertexColors,
            side: THREE.BackSide,
            polygonOffset: true,
            polygonOffsetFactor: 1,
            polygonOffsetUnits: 1,
            map: dataTextures[0],
            transparent: !!(textureFile.flags & 0x4000),
            alphaTest: 0.3
        });

        if(textureFile.frames.length > 1)
        {
            material.userData = { animMaps: dataTextures, animIndex: 0, timePerFrame: textureFile.header.unk28, dt: 0 };
            //console.log(textureFile.header);
        }

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
                subMesh.header.textureFileIndex = 0;
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
        var material = new THREE.SpriteMaterial({ map: dataTexture, color: 0xFF0000, fog: false });
        materials.push(material);
    });

    rr64.itemPlacements.forEach(item => {
        var sprite = new THREE.Sprite(materials[ITEM_TEX_INDICES[item.itemId]]);
        sprite.position.set(-item.x * 4, item.z * 4, item.y * 4);
        sprite.scale.set(10, 10, 10);
        sprites.push(sprite);
    });

    return sprites;
}

RR64ToTHREE.createPositionedObjectMeshes = function(rr64)
{
    // group placements by model index
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

        instances[modelIndex].push(nObjectPlacement);
    }

    var meshes = [];

    for(var modelIndex in instances)
    {
        var placementIndices = instances[modelIndex];
        var objectModel = rr64.objectModels[modelIndex];

        var instancedMesh = RR64ToTHREE.createInstancedMeshFromObjectModel(objectModel, placementIndices.length);
        var userData = [];

        for(var i in placementIndices)
        {
            var nObjectPlacement = placementIndices[i];
            var p = rr64.objectPlacements[nObjectPlacement];

            var position = new THREE.Vector3(-p.posX * 4, p.posZ * 4, p.posY * 4);
            var quaternion = new THREE.Quaternion(p.qX, p.qZ, p.qY, p.qW);
            var scale = new THREE.Vector3(0.5, 0.5, 0.5);
            var matrix = new THREE.Matrix4();
            matrix.compose(position, quaternion, scale);

            instancedMesh.setMatrixAt(i, matrix);
            userData.push({ type: 'map_object_placement', nObjectPlacement: nObjectPlacement | 0 });
        }

        instancedMesh.userData = userData;
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
        
        var dataTextures = [];

        textureFile.frames.forEach(frameData =>
        {
            var dataTexture = new THREE.DataTexture(
                frameData,
                textureFile.width,
                textureFile.height,
                THREE.RGBAFormat);

            dataTexture.wrapS = THREE.RepeatWrapping;
            dataTexture.wrapT = THREE.RepeatWrapping;
            dataTexture.magFilter = THREE.LinearFilter;
            dataTexture.minFilter = THREE.LinearFilter;

            dataTextures.push(dataTexture);
        });
        
        var material = new THREE.MeshBasicMaterial({
            side: THREE.BackSide,
            polygonOffset: true,
            polygonOffsetFactor: 1,
            polygonOffsetUnits: 1,
            map: dataTextures[0],
            transparent: !!(textureFile.flags & 0x4000)
        });

        if(material.transparent)
        {
            material.alphaTest = 0.3;
        }
        
        if(textureFile.frames.length > 1)
        {
            material.userData = { animMaps: dataTextures, animIndex: 0, timePerFrame: textureFile.header.unk28, dt: 0 };
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

RR64ToTHREE.createPointsFromPathData = function(rr64, mapMesh)
{
    const Z_OFFSET = 2000; 

    var threeObjects = [];

    var subPaths = [];
    var curSubPath = null;

    // 2, 4, 1, 4, 1, ... 3, 5, 5
    var typeColors = [
        /*00*/ null, //unused
        /*01*/ [ 1.0, 1.0, 1.0 ],
        /*02*/ [ 0.0, 1.0, 1.0 ],
        /*03*/ [ 1.0, 0.0, 1.0 ],
        /*04*/ [ 0.5, 0.5, 0.5 ],
        /*05*/ [ 0.0, 0.0, 0.0]
    ];

    var raycaster = new THREE.Raycaster();
    var rayOrigin = new THREE.Vector3();
    var rayDirection = new THREE.Vector3(0, -1, 0);
    raycaster.ray.direction.copy(rayDirection);

    rr64.pathData.forEach(point => {
        if(point.unk00 == 0x05) 
        {
            // what is this for? does not have x,y components
            return;
        }

        if(point.unk00 == 0x02) // start a new path
        {
            curSubPath = { positions: [], colors: [] };
            subPaths.push(curSubPath);
        }

        var color = typeColors[point.unk00];

        // way too slow
        //raycaster.ray.origin.set(-point.x * 4, Z_OFFSET, point.y * 4);
        //var intersections = raycaster.intersectObject(mapMesh);
        //var ipoint = null;
        //if(intersections.length == 0)
        //{
        //    ipoint = new THREE.Vector3(-point.x * 4, 0, point.y * 4)
        //}
        //else
        //{
        //    ipoint = intersections[intersections.length-1].point;
        //}

        curSubPath.positions.push(-point.x * 4, Z_OFFSET, point.y * 4);
        curSubPath.colors.push(color[0], color[1], color[2]);
    });

    var pointsMaterial = new THREE.PointsMaterial({ vertexColors: THREE.VertexColors, size: 3, sizeAttenuation: false });
    var lineMaterial = new THREE.LineBasicMaterial({ vertexColors: THREE.VertexColors });

    subPaths.forEach(subPath =>
    {
        var geometry = new THREE.BufferGeometry();

        var fPositions = new Float32Array(subPath.positions);
        var fColors = new Float32Array(subPath.colors);
    
        geometry.setAttribute('position', new THREE.BufferAttribute(fPositions, 3));
        geometry.setAttribute('color', new THREE.BufferAttribute(fColors, 3));

        var points = new THREE.Points(geometry, pointsMaterial);
        var line = new THREE.Line(geometry, lineMaterial);

        threeObjects.push(points, line);
    });

    return threeObjects;
}

RR64ToTHREE.createPointsFromRaces = function(rr64)
{
    // todo sprite labels of the race names
    const Z_OFFSET = 2000;

    var positions = [];
    var colors = [];

    rr64.races.forEach(race => {
        positions.push(-race.startX * 4, Z_OFFSET, race.startY * 4);
        positions.push(-race.endX * 4, Z_OFFSET, race.endY * 4);
        colors.push(0, 1, 0);
        colors.push(1, 0, 0);
    });

    var fPositions = new Float32Array(positions);
    var fColors = new Float32Array(colors);

    var geometry = new THREE.BufferGeometry();
    var pointsMaterial = new THREE.PointsMaterial({ vertexColors: THREE.VertexColors, size: 5, sizeAttenuation: false });

    geometry.setAttribute('position', new THREE.BufferAttribute(fPositions, 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(fColors, 3));

    return new THREE.Points(geometry, pointsMaterial);
}