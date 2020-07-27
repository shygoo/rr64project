function Viewer(queryDomContainer, config)
{
    this.cameraSpeed = config.cameraSpeed || 30;
    this.cameraNear = config.cameraNear || 1;
    this.cameraFar = config.cameraFar || 90000;
    this.fogNear = config.fogNear || 1;
    this.fogFar = config.fogFar || 5000;
    this.clearColor = config.clearColor || 0xFFFFFF;
    this.fogColor = config.fogColor || 0xFFFFFF;

    this.counter = 0;

    this.pickfilter = config.pickfilter || function() { return []; } ;
    this.onpick = config.onpick || function() { return []; };
    this.onanimate = config.onanimate || function() {};

    this.cameraDefaultPos = new THREE.Vector3(
        config.cameraDefaultX || 0,
        config.cameraDefaultY || 0,
        config.cameraDefaultZ || 0);

    this.width = window.innerWidth;
    this.height = window.innerHeight;

    this.renderer = new THREE.WebGLRenderer({ antialias: false });
    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(60, this.width/this.height, this.cameraNear, this.cameraFar);
    this.scene.fog = new THREE.Fog(this.fogColor, this.cameraFar, this.cameraFar);
    this.raycaster = new THREE.Raycaster();
    this.mouse = new THREE.Vector2();
    this.hud = new Viewer.HUD(this);

    this.keysDown = {};
    this.layers = {};

    this.camStepX = 0;
    this.camStepY = 0;
    this.camStepZ = 0;
    this.camRotStepX = 0;
    this.camRotStepY = 0;

    this.renderer.setPixelRatio(window.devicePixelRatio);
    this.renderer.setSize(this.width, this.height);
    this.renderer.setViewport(0, 0, this.width, this.height);
    this.renderer.setScissorTest(true);
    this.renderer.setScissor(0, 0, this.width, this.height);
    this.renderer.setClearColor(this.clearColor, 1.0);
    this.renderer.alpha = true;
    
    this.camera.rotation.order = "YXZ";

    this.camera.translateX(this.cameraDefaultPos.x);
    this.camera.translateY(this.cameraDefaultPos.y);
    this.camera.translateZ(this.cameraDefaultPos.z);

    this.domContainer = document.querySelector(queryDomContainer);

    this.domCanvas = this.renderer.domElement;
    this.domCanvas.style.imageRendering = "pixelated";
    this.domCanvas.tabIndex = '0';

    this.domContainer.appendChild(this.hud.domElement);
    this.domContainer.appendChild(this.domCanvas);

    for(var eventType in Viewer.Events)
    {
        this.domCanvas.addEventListener(eventType,
            Viewer.Events[eventType].bind(this));
    }

    window.addEventListener('resize', (e) =>
    {
        if(!this.camera || !this.renderer)
        {
            return;
        }

        this.width = window.innerWidth;
        this.height = window.innerHeight;
        this.camera.aspect = (this.width / this.height);
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(this.width, this.height);
        this.renderer.setViewport(0, 0, this.width, this.height);
        this.renderer.setScissor(0, 0, this.width, this.height);
    });
}

Viewer.prototype.layer = function(name)
{
    if(typeof this.layers[name] == 'undefined')
    {
        this.layers[name] = new Viewer.Layer(this, name);
    }

    return this.layers[name];
}

Viewer.prototype.animate = function()
{
    for(var keyCode in this.keysDown)
    {
        if(keyCode in Viewer.KeyEvents)
        {
            Viewer.KeyEvents[keyCode].call(this);
        }
    }

    this.onanimate();

    this.camera.translateX(this.camStepX);
    this.camera.translateY(this.camStepY);
    this.camera.translateZ(this.camStepZ);

    this.camera.rotateX(this.camRotStepX / 1000);
    this.camera.rotateY(this.camRotStepY / 1000);
    this.camera.rotation.z = 0;

    this.camStepX *= 0.5;
    this.camStepY *= 0.5;
    this.camStepZ *= 0.5;

    this.renderer.render(this.scene, this.camera);
    this.counter++;

    this.hud.update();

    requestAnimationFrame(this.animate.bind(this));
}

Viewer.Events = {};
Viewer.KeyEvents = {};

Viewer.Events['keydown'] = function(e)
{
    var key = String.fromCharCode(e.keyCode);

    if(key in Viewer.KeyEvents)
    {
        this.keysDown[key] = true;
        e.preventDefault();
    }
}

Viewer.Events['keyup'] = function(e)
{
    var key = String.fromCharCode(e.keyCode);
    delete this.keysDown[key];
    e.preventDefault();
}

Viewer.Events['contextmenu'] = function(e)
{
    e.preventDefault();
}

Viewer.Events['click'] = function(e)
{
    this.raycaster.setFromCamera(this.mouse, this.camera);
    var intersections = this.raycaster.intersectObjects(this.pickfilter());
    this.onpick(intersections);
}

Viewer.Events['mousedown'] = function(e)
{
    this.mouseDownTimeout = setTimeout(() => {
        this.domCanvas.requestPointerLock();
    }, 150);
}

Viewer.Events['mouseup'] = function(e)
{
    clearTimeout(this.mouseDownTimeout);
    document.exitPointerLock();
}

Viewer.Events['mousemove'] = function(e)
{
    this.mouse.x = (e.clientX / window.innerWidth) * 2 - 1;
    this.mouse.y = -(e.clientY / window.innerHeight) * 2 + 1;

    if(e.buttons == 0)
    {
        return;
    }

    var movementX = e.movementX / 4;
    var movementY = e.movementY / 4;

    if(e.buttons == 1)
    {
        this.camera.translateX(-movementX * 5);
        this.camera.translateY(movementY * 5);
    }

    if(e.buttons == 4)
    {
        this.camera.translateZ(-movementX * 5);
        this.camera.translateZ(movementY * 5);
    }

    if(e.buttons == 2)
    {
        this.camera.rotateY(-movementX * 0.01);
        this.camera.rotateX(-movementY * 0.01);
        this.camera.rotation.z = 0;
    }
}

Viewer.Events['wheel'] = function(e)
{
    var d = -(e.deltaY / 100);
    this.cameraSpeed += d * 5;

    this.cameraSpeed = this.cameraSpeed - (this.cameraSpeed % 5);

    if(this.cameraSpeed < 1)
    {
        this.cameraSpeed = 1;
    }
}

Viewer.KeyEvents['W'] = function() { this.camStepZ = -this.cameraSpeed; }
Viewer.KeyEvents['A'] = function() { this.camStepX = -this.cameraSpeed; }
Viewer.KeyEvents['S'] = function() { this.camStepZ = this.cameraSpeed; }
Viewer.KeyEvents['D'] = function() { this.camStepX = this.cameraSpeed; }
Viewer.KeyEvents['Z'] = function() { this.camStepY = -this.cameraSpeed; }
Viewer.KeyEvents['X'] = function() { this.camStepY = this.cameraSpeed; }

//////////////////////////////////////////////////

Viewer.Layer = function(viewer, name, label)
{
    this.name = name;
    this.label = label;
    this.viewer = viewer;
    this.objects = [];
}

Viewer.Layer.prototype.add = function(objects)
{
    if(Array.isArray(objects))
    {
        objects.forEach(object => {
            this.objects.push(object);
            this.viewer.scene.add(object)
        });
    }
    else
    {
        this.objects.push(objects);
        this.viewer.scene.add(objects);
    }
}

Viewer.Layer.prototype.setVisible = function(bVisible)
{
    this.objects.forEach(object => {
        object.visible = bVisible;
    });
}

//////////////////////////////////////////////////

Viewer.HUD = function(viewer)
{
    this.viewer = viewer;
    this.domElement = document.createElement('div');
    this.domElement.style = "position: absolute;" +
                            "margin: 10px;" +
                            "padding: 10px;" +
                            "font-size: 11px;" +
                            "background-color: rgba(0, 0, 0, 0.2);" +
                            "font-family: consolas, monospace;";
    this.variables = [];
    this.elements = {};
}

Viewer.HUD.prototype.addMonitor = function(key, label, getter)
{
    var domRow = document.createElement('div');
    var domLabel = document.createElement('span');
    var domValue = document.createElement('span');
    domLabel.innerHTML = label;
    domRow.appendChild(domLabel);
    domRow.appendChild(new Text(': '));
    domRow.appendChild(domValue);
    this.domElement.appendChild(domRow);
    this.variables.push({ domValue: domValue, getter: getter });

    this.elements[key] = { domRow: domRow, domValueElement: domValue };
}

Viewer.HUD.prototype.addCheckbox = function(key, label, onchange, defaultValue)
{
    var domRow = document.createElement('div');
    var domLabel = document.createElement('label');
    var domCheckbox = document.createElement('input');
    domLabel.style = "font-family: inherit;"
    domCheckbox.style = "margin: 0px 2px 0px 0px; vertical-align: bottom;";
    domCheckbox.setAttribute('type', 'checkbox');
    domCheckbox.setAttribute('tabindex', '-1');
    domLabel.appendChild(domCheckbox);
    domLabel.appendChild(new Text(label));
    domRow.appendChild(domLabel);
    
    domCheckbox.checked = defaultValue;

    domCheckbox.addEventListener('change', (e) => {
        this.viewer.domCanvas.focus();
        onchange(e.target.checked);
    });

    this.domElement.appendChild(domRow);
    this.elements[key] = { domRow: domRow, domValueElement: domCheckbox };
}

Viewer.HUD.prototype.addSelect = function(key, label, options, onchange)
{
    var domRow = document.createElement('div');
    var domLabel = document.createElement('span');
    var domSelect = document.createElement('select');
    domSelect.setAttribute('tabindex', '-1');
    domSelect.style = "font-family: inherit; margin-left: 5px;";

    domLabel.appendChild(new Text(label));

    domRow.appendChild(domLabel);
    domRow.appendChild(domSelect);

    options.forEach(option => {
        var domOption = document.createElement('option');
        domOption.appendChild(new Text(option));
        domSelect.appendChild(domOption);
    })

    domSelect.addEventListener('change', (e) =>
    {
        var selection = { index: domSelect.selectedIndex, value: domSelect.value };
        onchange(selection);
    });

    this.domElement.appendChild(domRow);
    this.elements[key] = { domRow: domRow, domValueElement: domSelect };
}

Viewer.HUD.prototype.addSeparator = function()
{
    this.domElement.appendChild(document.createElement('hr'));
}

Viewer.HUD.prototype.setItemVisible = function(key, bVisible)
{
    this.elements[key].domRow.style.display = bVisible ? 'block' : 'none';
}

Viewer.HUD.prototype.getItemValue = function(key)
{
    var domValueElement = this.elements[key].domValueElement;

    if(domValueElement.tagName == 'INPUT')
    {
        if(domValueElement.type == 'checkbox')
        {
            return domValueElement.checked;
        }

        return domValueElement.value;
    }
    else if(domValueElement.tagName == 'SPAN')
    {
        return domValueElement.innerHTML;
    }
}

Viewer.HUD.prototype.update = function()
{
    for(var i in this.variables)
    {
        this.variables[i].domValue.innerHTML = this.variables[i].getter();
    }
}

