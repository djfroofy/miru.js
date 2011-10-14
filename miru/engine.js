(function() {
  var CameraUtils, Collider, DEBUG, DebugLight, DebugXZPlane, Frustum, GameObject, GeometryUtils, LightUtils, MapAnimation, MaterialUtils, Miru, RandomUtils, SSCameraTrack, SoundManager, TextureUtils, Vector3, VideoPlane, World, bindnames, f, removeFromArray, vertex;
  var __bind = function(fn, me){ return function(){ return fn.apply(me, arguments); }; }, __slice = Array.prototype.slice, __hasProp = Object.prototype.hasOwnProperty, __extends = function(child, parent) {
    for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; }
    function ctor() { this.constructor = child; }
    ctor.prototype = parent.prototype;
    child.prototype = new ctor;
    child.__super__ = parent.prototype;
    return child;
  }, __indexOf = Array.prototype.indexOf || function(item) {
    for (var i = 0, l = this.length; i < l; i++) {
      if (this[i] === item) return i;
    }
    return -1;
  };
  Miru = Miru === void 0 ? {} : Miru;
  f = Util.f;
  bindnames = Util.bindnames;
  removeFromArray = Util.removeFromArray;
  Vector3 = THREE.Vector3;
  Miru.DEBUG = true;
  DEBUG = Miru.DEBUG;
  vertex = function(x, y, z) {
    return new THREE.Vertex(new THREE.Vector3(x, y, z));
  };
  Miru.vertex = vertex;
  World = (function() {
    World.defaults = {
      camera: f(function() {
        return CameraUtils.positioned();
      }),
      renderer: f(function() {
        return World._defaultRenderer();
      }),
      lights: f(function() {
        return [];
      }),
      addstats: false,
      screenwidth: null,
      screenheight: null,
      playerStats: f(function() {
        return {};
      }),
      scene: f(function() {
        return World._defaultScene();
      }),
      osd: false
    };
    function World(parameters) {
      var light, xzplane, _i, _len, _ref;
      if (parameters == null) {
        parameters = {};
      }
      this.onDocumentMouseMove = __bind(this.onDocumentMouseMove, this);
      this.animate = __bind(this.animate, this);
      bindnames(this, parameters, World.defaults);
      this.mouse = {
        x: 0,
        y: 0
      };
      this.scenes = [];
      this.scenes.push(this.scene);
      this.cameras = [];
      this.cameras.push(this.camera);
      this.objects = [];
      _ref = this.lights;
      for (_i = 0, _len = _ref.length; _i < _len; _i++) {
        light = _ref[_i];
        this.scene.addLight(light);
      }
      delete this.lights;
      this.last = null;
      this.stats = null;
      this.resizables = [];
      this._scheduled_remove = [];
      if (this.osd) {
        this.osd_scene = new THREE.Scene();
        this.osd_scene.addLight(new THREE.AmbientLight(0xffffff));
        window.osd_scene = this.osd_scene;
        this.osd_camera = Miru.CameraUtils.osd();
        this.addScene(this.osd_scene, this.osd_camera);
      }
      delete this.osd;
      this._projector = new THREE.Projector();
      this.setUp();
      if (this.debug) {
        xzplane = new Miru.DebugXZPlane({
          min: -30000,
          max: 30000
        });
        this.addObject(xzplane);
        setInterval(this.debugF, 5000);
      }
    }
    World.prototype.setPrimaryCamera = function(camera) {
      this.cameras[0] = camera;
      return this.camera = camera;
    };
    World.prototype.setPrimaryScene = function(scene) {
      this.scenes[0] = scene;
      return this.scene = scene;
    };
    World._defaultScene = function() {
      return new THREE.Scene();
    };
    World._defaultRenderer = function() {
      var renderer;
      renderer = new THREE.WebGLRenderer();
      renderer.autoClear = false;
      return renderer;
    };
    World.prototype.addScene = function(scene, camera) {
      this.scenes.push(scene);
      return this.cameras.push(camera);
    };
    World.prototype.addObject = function(object, scene) {
      var renderable, _i, _len, _ref;
      if (scene == null) {
        scene = null;
      }
      if (scene === null) {
        scene = this.scene;
      }
      this.objects.push(object);
      object.world = this;
      _ref = object.renderables;
      for (_i = 0, _len = _ref.length; _i < _len; _i++) {
        renderable = _ref[_i];
        renderable.gameObject = object;
        scene.addChild(renderable);
      }
      if (object.resizable) {
        return this.resizables.push(object);
      }
    };
    World.prototype.removeObject = function(object, scene) {
      if (scene == null) {
        scene = null;
      }
      if (scene === null) {
        scene = this.scene;
      }
      return this._scheduled_remove.push([object, scene]);
    };
    World.prototype._removeObject = function(object, scene) {
      var renderable, _i, _len, _ref;
      removeFromArray(this.objects, object);
      _ref = object.renderables;
      for (_i = 0, _len = _ref.length; _i < _len; _i++) {
        renderable = _ref[_i];
        scene.removeObject(renderable);
      }
      if (object.resizable) {
        return removeFromArray(this.resizables, object);
      }
    };
    World.prototype.activate = function() {
      this.container = document.createElement('div');
      this.activateRenderer();
      this.attachEventListeners();
      document.body.appendChild(this.container);
      this.activated = true;
      return this.animate();
    };
    World.prototype.deactivate = function() {
      return this.activated = false;
    };
    World.prototype.activateRenderer = function() {
      var stats;
      if (this.screenwidth === null) {
        this.resize(window.innerWidth, window.innerHeight);
      } else {
        this.resize(this.screenwidth, this.screenheight);
      }
      if (this.addstats) {
        this.stats = stats = new Stats();
        stats.domElement.style.position = "absolute";
        stats.domElement.style.top = "0px";
        this.container.appendChild(stats.domElement);
      }
      return this.container.appendChild(this.renderer.domElement);
    };
    World.prototype.attachEventListeners = function() {
      var eventname, name, _results;
      _results = [];
      for (name in this) {
        _results.push(name.substring(0, 10) === 'onDocument' ? (eventname = name.substring(10).toLowerCase(), window.document.addEventListener(eventname, this[name])) : void 0);
      }
      return _results;
    };
    World.prototype.resize = function(w, h) {
      var o, _i, _len, _ref, _results;
      this.renderer.setSize(w, h);
      this.screenwidth = w;
      this.screenheight = h;
      _ref = this.resizables;
      _results = [];
      for (_i = 0, _len = _ref.length; _i < _len; _i++) {
        o = _ref[_i];
        _results.push(o.resize(w, h));
      }
      return _results;
    };
    World.prototype.update = function() {
      var dt, o, object, pair, scene, seconds, _i, _j, _len, _len2, _ref, _ref2;
      seconds = new Date().getTime() * 0.001;
      if (this.last === null) {
        this.last = seconds;
      }
      dt = seconds - this.last;
      dt = Math.min(dt, 0.2);
      _ref = this.objects;
      for (_i = 0, _len = _ref.length; _i < _len; _i++) {
        o = _ref[_i];
        o.update(seconds, dt);
      }
      this.last = seconds;
      _ref2 = this._scheduled_remove;
      for (_j = 0, _len2 = _ref2.length; _j < _len2; _j++) {
        pair = _ref2[_j];
        object = pair[0];
        scene = pair[1];
        this._removeObject(object, scene);
      }
      return this._scheduled_remove = [];
    };
    World.prototype.animate = function() {
      var c, index, scene, _len, _ref;
      requestAnimationFrame(this.animate);
      this.update();
      this.renderer.clear();
      _ref = this.scenes;
      for (index = 0, _len = _ref.length; index < _len; index++) {
        scene = _ref[index];
        if (scene) {
          c = this.cameras[index];
          this.renderer.render(scene, c);
          if (c.frustum) {
            c.frustum.update(c);
          }
        }
      }
      if (this.stats) {
        return this.stats.update();
      }
    };
    World.prototype.render = function() {
      var args, _ref;
      args = 1 <= arguments.length ? __slice.call(arguments, 0) : [];
      return (_ref = this.renderer).render.apply(_ref, args);
    };
    World.prototype.onDocumentMouseMove = function(event) {
      event.preventDefault();
      this.mouse.x = (event.clientX / this.screenwidth) * 2 - 1;
      return this.mouse.y = -(event.clientY / this.screenheight) * 2 + 1;
    };
    World.prototype.raycastMouse = function(scene, camera) {
      var intersects, mesh, ray, vector, _i, _len, _results;
      if (scene == null) {
        scene = null;
      }
      if (camera == null) {
        camera = null;
      }
      if (scene === null) {
        scene = this.scene;
        camera = this.camera;
      }
      vector = new THREE.Vector3(this.mouse.x, this.mouse.y, 0.5);
      this._projector.unprojectVector(vector, camera);
      ray = new THREE.Ray(camera.position, vector.subSelf(camera.position).normalize());
      intersects = ray.intersectScene(scene);
      _results = [];
      for (_i = 0, _len = intersects.length; _i < _len; _i++) {
        mesh = intersects[_i];
        _results.push(mesh.object.gameObject);
      }
      return _results;
    };
    World.prototype.setUp = function() {};
    return World;
  })();
  Miru.World = World;
  GameObject = (function() {
    GameObject.prototype.resizable = false;
    function GameObject(renderables) {
      this.renderables = renderables != null ? renderables : [];
    }
    GameObject.prototype.update = function(seconds, dt) {};
    GameObject.prototype.world = null;
    return GameObject;
  })();
  Miru.GameObject = GameObject;
  SSCameraTrack = (function() {
    __extends(SSCameraTrack, GameObject);
    /*
        A side scrolling camera track.
        */
    SSCameraTrack.prototype.resizable = true;
    SSCameraTrack._defaults = {
      marginx: 0.21,
      marginy: 0.21,
      trackz: false,
      center: false
    };
    function SSCameraTrack(camera, target, parameters) {
      this.camera = camera;
      this.target = target;
      if (parameters == null) {
        parameters = {};
      }
      /*
              Give me a camera and a target mesh to follow and I'll follow it
              within marginx and marginy of the screen horinzontally and vertically.
              Margin x an y are a percentage of the screen width or height given as float
              in the range [0,1]
      
      
              This assumes of course the camera is looking parallel to the z-axis with
              up vector also parallel to z-axis.
              */
      SSCameraTrack.__super__.constructor.call(this, []);
      bindnames(this, parameters, SSCameraTrack._defaults);
      this._cache = [0, 0, 0];
      this._projector = new THREE.Projector();
      this._w = null;
      this._h = null;
    }
    SSCameraTrack.prototype.update = function(seconds, dt) {
      var deltax, deltay, deltaz, sx, sy, v, x, y, z;
      x = this.target.position.x;
      y = this.target.position.y;
      z = this.target.position.z;
      if ([x, y, z] === this._cache) {
        return;
      }
      deltax = x - this._cache[0];
      deltay = y - this._cache[1];
      deltaz = z - this._cache[2];
      if (this.center) {
        this.camera.position.x += deltax;
        this.camera.position.y += deltay;
        this.camera.target.position.x += deltax;
        this.camera.target.position.y += deltay;
      }
      if (this.trackz) {
        this.camera.position.z += deltaz;
        this.camera.target.position.z += deltaz;
      }
      this._cache = [x, y, z];
      if (this.center) {
        return;
      }
      v = this.target.position.clone();
      this._projector.projectVector(v, this.camera);
      sx = this._w / 2 - v.x * this._w / 2;
      sy = this._h / 2 - v.y * this._h / 2;
      if (sx < this._edgex || sx > (this._w - this._edgex)) {
        this.camera.position.x += deltax;
        this.camera.target.position.x += deltax;
      }
      if (sy < this._edgey || sy > (this._h - this._edgey)) {
        this.camera.position.y += deltay;
        return this.camera.target.position.y += deltay;
      }
    };
    SSCameraTrack.prototype.resize = function(_w, _h) {
      this._w = _w;
      this._h = _h;
      if (Miru.DEBUG) {
        console.log("<SSCameraTrack> resizing w=" + this._w + " h=" + this._h);
      }
      this._edgex = this._w * this.marginx;
      return this._edgey = this._h * this.marginy;
    };
    return SSCameraTrack;
  })();
  Miru.SSCameraTrack = SSCameraTrack;
  VideoPlane = (function() {
    __extends(VideoPlane, GameObject);
    VideoPlane._defaults = {
      width: 100,
      height: 100,
      segmentsWidth: 4,
      segmentsHeight: 4,
      position: f(function() {
        return new THREE.Vector3(0, 0, 0);
      }),
      videoElement: null,
      videoSelector: 'video',
      scale: 1,
      play: false
    };
    function VideoPlane(parameters) {
      var h, image, mat, options, plane, w;
      if (parameters == null) {
        parameters = {};
      }
      VideoPlane.__super__.constructor.call(this, []);
      options = {};
      bindnames(options, parameters, VideoPlane._defaults);
      if (options.videoElement === null) {
        options.videoElement = document.getElementById(options.videoSelector);
      }
      this.video = options.videoElement;
      if (options.play) {
        this.video.play();
      }
      w = options.width;
      h = options.height;
      image = document.createElement('canvas');
      image.width = w;
      image.height = h;
      this.imageContext = image.getContext('2d');
      this.imageContext.fillStyle = '#000000';
      this.imageContext.fillRect(0, 0, w, h);
      this.texture = new THREE.Texture(image);
      this.texture.minFilter = THREE.LinearFilter;
      this.texture.maxFilter = THREE.LinearFilter;
      mat = new THREE.MeshBasicMaterial({
        map: this.texture
      });
      plane = new THREE.PlaneGeometry(w, h, options.segmentsWidth, options.segmentsHeight);
      this.mesh = new THREE.Mesh(plane, mat);
      this.mesh.scale.x = this.mesh.scale.y = this.mesh.scale.z = options.scale;
      this.mesh.overdraw = true;
      this.mesh.position = options.position;
      this.renderables.push(this.mesh);
    }
    VideoPlane.prototype.update = function(seconds, dt) {
      if (this.video.readyState === this.video.HAVE_ENOUGH_DATA) {
        this.imageContext.drawImage(this.video, 0, 0);
        return this.texture.needsUpdate = true;
      }
    };
    return VideoPlane;
  })();
  Miru.VideoPlane = VideoPlane;
  Collider = (function() {
    __extends(Collider, GameObject);
    function Collider() {
      Collider.__super__.constructor.call(this, []);
      this.objects = [];
    }
    Collider.prototype.add = function(obj) {
      return this.objects.push(obj);
    };
    Collider.prototype.update = function(seconds, dt) {
      var i, l, o, other, _ref, _results;
      l = this.objects.length;
      _ref = this.objects;
      _results = [];
      for (i in _ref) {
        o = _ref[i];
        _results.push((function() {
          var _i, _len, _ref2, _results2;
          _ref2 = this.objects.slice(i + 1, l);
          _results2 = [];
          for (_i = 0, _len = _ref2.length; _i < _len; _i++) {
            other = _ref2[_i];
            _results2.push(o.collides(other) ? (o.collide(other), other.collide(o)) : void 0);
          }
          return _results2;
        }).call(this));
      }
      return _results;
    };
    return Collider;
  })();
  Miru.Collider = Collider;
  LightUtils = (function() {
    function LightUtils() {}
    LightUtils._smoovdefaults = {
      points: f(function() {
        return [0, 100, 0];
      }),
      color: "0xf0f0f0",
      intensity: 1
    };
    LightUtils.smoov = function(parameters) {
      var l, lights, options, point, _i, _len, _ref;
      if (parameters == null) {
        parameters = {};
      }
      options = {};
      bindnames(options, parameters, LightUtils._smoovdefaults);
      lights = [];
      _ref = options.points;
      for (_i = 0, _len = _ref.length; _i < _len; _i++) {
        point = _ref[_i];
        l = new THREE.PointLight(options.colorhex);
        l.position = new Vector3(point[0], point[1], point[2]);
        l.intensity = options.intensity;
        lights.push(l);
      }
      return lights;
    };
    return LightUtils;
  })();
  Miru.LightUtils = LightUtils;
  CameraUtils = (function() {
    function CameraUtils() {}
    CameraUtils._positioned_defaults = {
      position: f(function() {
        return new Vector3(0, 0, 0);
      }),
      fov: 33,
      near: 1,
      far: 100000
    };
    CameraUtils._fly_defaults = {
      fov: 25,
      aspect: window.innerWidth / window.innerHeight,
      movementSpeed: 5000,
      rollSpeed: Math.PI / 24,
      autoForward: false,
      dragToLook: true,
      near: 50,
      far: 1e7,
      position: f(function() {
        return new Vector3(100, 1000, 60000);
      }),
      quaternion: new THREE.Quaternion(0, 0, 0, 1)
    };
    CameraUtils._osd_defaults = {
      fov: 25,
      near: -2000,
      far: 1000,
      position: f(function() {
        return new THREE.Vector3(0, 0, 500);
      })
    };
    CameraUtils._firstperson_defaults = {
      fov: 60,
      aspect: window.innerWidth / window.innerHeight,
      near: 1,
      far: 20000,
      movementSpeed: 3000,
      lookSpeed: 0.25,
      noFly: false,
      lookVertical: true,
      position: f(function() {
        return new THREE.Vector3(0, 1000, 0);
      })
    };
    CameraUtils.positioned = function(parameters) {
      var camera, options;
      if (parameters == null) {
        parameters = {};
      }
      options = {};
      bindnames(options, parameters, CameraUtils._positioned_defaults);
      camera = new THREE.Camera(options.fov, window.innerWidth / window.innerHeight, options.near, options.far);
      camera.position = options.position;
      return camera;
    };
    CameraUtils.fly = function(parameters) {
      var camera, options;
      if (parameters == null) {
        parameters = {};
      }
      options = {};
      bindnames(options, parameters, CameraUtils._fly_defaults);
      camera = new THREE.FlyCamera(options);
      camera.position = options.position;
      camera.quaternion = options.quaternion;
      return camera;
    };
    CameraUtils.osd = function(parameters) {
      var camera, options;
      if (parameters == null) {
        parameters = {};
      }
      options = {};
      bindnames(options, parameters, CameraUtils._osd_defaults);
      camera = new THREE.Camera(options.fov, window.innerWidth / window.innerHeight, options.near, options.far);
      camera.position = options.position;
      camera.projectionMatrix = THREE.Matrix4.makeOrtho(window.innerWidth / -2, window.innerWidth / 2, window.innerHeight / 2, window.innerHeight / -2, options.near, options.far);
      return camera;
    };
    CameraUtils.firstperson = function(parameters) {
      var camera, options;
      if (parameters == null) {
        parameters = {};
      }
      options = {};
      bindnames(options, parameters, CameraUtils._firstperson_defaults);
      camera = new THREE.QuakeCamera(options);
      camera.position = options.position;
      return camera;
    };
    return CameraUtils;
  })();
  Miru.CameraUtils = CameraUtils;
  MaterialUtils = (function() {
    function MaterialUtils() {}
    MaterialUtils._cache = {};
    MaterialUtils._smoovdefaults = {
      color: 0xf0f0f0,
      ambient: 0xf0f0f0,
      specular: 0xf0f0f0,
      shading: THREE.SmoothShading,
      shininess: 1,
      opacity: 1,
      cache: true
    };
    MaterialUtils.smoov = function(parameters) {
      var key, options, v;
      if (parameters == null) {
        parameters = {};
      }
      options = {};
      bindnames(options, parameters, MaterialUtils._smoovdefaults);
      key = [options.color, options.ambient, options.specular, options.shading, options.shininess, options.opacity];
      if (options.cache && __indexOf.call(MaterialUtils._cache, key) >= 0) {
        return MaterialUtils._cache[key];
      }
      v = new THREE.MeshPhongMaterial({
        ambient: options.ambient,
        color: options.color,
        specular: options.specular,
        shininess: options.shininess,
        opacity: options.opacity,
        shading: options.shading
      });
      if (options.cache) {
        MaterialUtils._cache[key] = v;
      }
      return v;
    };
    return MaterialUtils;
  })();
  Miru.MaterialUtils = MaterialUtils;
  TextureUtils = (function() {
    function TextureUtils() {}
    TextureUtils.textureFaces = function(geometry, urls) {
      var face, i, _len, _ref, _results;
      window.called_urls = urls;
      _ref = geometry.faces;
      _results = [];
      for (i = 0, _len = _ref.length; i < _len; i++) {
        face = _ref[i];
        _results.push(face.materials = [
          new THREE.MeshLambertMaterial({
            map: THREE.ImageUtils.loadTexture(urls[i])
          })
        ]);
      }
      return _results;
    };
    return TextureUtils;
  })();
  Miru.TextureUtils = TextureUtils;
  GeometryUtils = (function() {
    function GeometryUtils() {}
    GeometryUtils.CUBE = 1;
    GeometryUtils.LINE = 2;
    GeometryUtils._cache = {};
    GeometryUtils._cubedefaults = {
      w: 200,
      h: 200,
      d: 200,
      cache: true
    };
    GeometryUtils.cube = function(parameters) {
      var key, options, v;
      if (parameters == null) {
        parameters = {};
      }
      options = {};
      bindnames(options, parameters, GeometryUtils._cubedefaults);
      key = [GeometryUtils.CUBE, options.w, options.h, options.d];
      if (options.cache && __indexOf.call(GeometryUtils._cache, key) >= 0) {
        return GeometryUtils._cache[key];
      }
      v = new THREE.CubeGeometry(options.w, options.h, options.d);
      if (options.cache) {
        GeometryUtils._cache[key] = v;
      }
      return v;
    };
    return GeometryUtils;
  })();
  Miru.GeometryUtils = GeometryUtils;
  RandomUtils = (function() {
    function RandomUtils() {}
    RandomUtils.choose = function(array) {
      return array[Math.floor(array.length * Math.random())];
    };
    return RandomUtils;
  })();
  Miru.RandomUtils = RandomUtils;
  DebugXZPlane = (function() {
    __extends(DebugXZPlane, GameObject);
    DebugXZPlane.defaults = {
      color: 0xe0e0e0,
      min: -5000,
      max: 5000,
      intervals: 20,
      xcolor: 0x20e020,
      ycolor: 0x20e0e0,
      zcolor: 0xe02020,
      drawaxes: true
    };
    function DebugXZPlane(parameters) {
      var c, intervals, lineMaterials, max, mesh, min, options, planeColor, planeMaterial, s, xc, xlineGeom, xzplane, yc, ylineGeom, zc, zlineGeom;
      if (parameters == null) {
        parameters = {};
      }
      options = {};
      bindnames(options, parameters, DebugXZPlane.defaults);
      DebugXZPlane.__super__.constructor.call(this, []);
      planeColor = options.color;
      min = options.min;
      max = options.max;
      intervals = options.intervals;
      s = options.max - options.min;
      xc = options.xcolor;
      yc = options.ycolor;
      zc = options.zcolor;
      xzplane = new THREE.PlaneGeometry(s, s, 20, 20);
      planeMaterial = new THREE.MeshBasicMaterial({
        color: 0xe0e0e0,
        opacity: 1,
        wireframe: true
      });
      lineMaterials = (function() {
        var _i, _len, _ref, _results;
        _ref = [xc, yc, zc];
        _results = [];
        for (_i = 0, _len = _ref.length; _i < _len; _i++) {
          c = _ref[_i];
          _results.push(new THREE.LineBasicMaterial({
            color: c,
            opacity: 1,
            linewidth: 5
          }));
        }
        return _results;
      })();
      this.mesh = new THREE.Mesh(xzplane, planeMaterial);
      this.mesh.rotation.x = Math.PI / 2;
      this.renderables.push(this.mesh);
      if (options.drawaxes) {
        xlineGeom = new THREE.Geometry();
        xlineGeom.vertices.push(vertex(-90000, 0, 0));
        xlineGeom.vertices.push(vertex(90000, 0, 0));
        mesh = new THREE.Line(xlineGeom, lineMaterials[0]);
        this.renderables.push(mesh);
        ylineGeom = new THREE.Geometry();
        ylineGeom.vertices.push(vertex(0, -90000, 0));
        ylineGeom.vertices.push(vertex(0, 90000, 0));
        mesh = new THREE.Line(ylineGeom, lineMaterials[1]);
        this.renderables.push(mesh);
        zlineGeom = new THREE.Geometry();
        zlineGeom.vertices.push(vertex(0, 0, -90000));
        zlineGeom.vertices.push(vertex(0, 0, 90000));
        mesh = new THREE.Line(zlineGeom, lineMaterials[2]);
        this.renderables.push(mesh);
      }
    }
    return DebugXZPlane;
  })();
  Miru.DebugXZPlane = DebugXZPlane;
  DebugLight = (function() {
    __extends(DebugLight, GameObject);
    DebugLight.defaults = {
      "polematerial": new THREE.LineBasicMaterial({
        color: 0xf0f0a0,
        wireframe: true,
        opacity: 0.5,
        linewidth: 3
      }),
      "bulbmaterial": new THREE.MeshBasicMaterial({
        color: 0xf0f0a0,
        opacity: 0.5
      })
    };
    function DebugLight(light, parameters) {
      var bulbgeom, bulbmat, lpos, options, polegeom, polemat;
      if (parameters == null) {
        parameters = {};
      }
      DebugLight.__super__.constructor.call(this, []);
      options = {};
      bindnames(options, parameters, DebugLight.defaults);
      this.light = light;
      lpos = light.position;
      polegeom = new THREE.Geometry();
      polegeom.vertices.push(vertex(0, 0, 0));
      polegeom.vertices.push(vertex(0, lpos.y - 48, 0));
      polemat = options.polematerial;
      this.polemesh = new THREE.Line(polegeom, polemat);
      this.polemesh.position.x = lpos.x;
      this.polemesh.position.z = lpos.z;
      bulbgeom = new THREE.SphereGeometry(50);
      bulbmat = options.bulbmat;
      this.bulbmesh = new THREE.Mesh(bulbgeom, bulbmat);
      this.bulbmesh.position = lpos.clone();
      this.renderables.push(this.polemesh);
      this.renderables.push(this.bulbmesh);
    }
    DebugLight.prototype.update = function(seconds, dt) {
      var bpos, lpos, ppos;
      lpos = this.light.position;
      bpos = this.bulbmesh.position;
      if (lpos.x !== bpos.x || lpos.y !== bpos.y || lpos.z !== bpos.z) {
        ppos = this.polemesh.position;
        ppos.x = lpos.x;
        ppos.z = lpos.z;
        if (bpos.y !== lpos.y) {
          this.polemesh.geometry.vertices[1].position.y = lpos.y - 48;
          this.polemesh.geometry.__dirtyVertices = true;
        }
        bpos.x = lpos.x;
        bpos.y = lpos.y;
        return bpos.z = lpos.z;
      }
    };
    return DebugLight;
  })();
  Miru.DebugLight = DebugLight;
  Frustum = (function() {
    function Frustum() {
      this._called = 0;
      this._frustum = [new THREE.Vector4(), new THREE.Vector4(), new THREE.Vector4(), new THREE.Vector4(), new THREE.Vector4(), new THREE.Vector4()];
      this._projScreenMatrix = new THREE.Matrix4();
    }
    Frustum.prototype.computeFrustum = function(m) {
      var i, plane, _results;
      this._frustum[0].set(m.n41 - m.n11, m.n42 - m.n12, m.n43 - m.n13, m.n44 - m.n14);
      this._frustum[1].set(m.n41 + m.n11, m.n42 + m.n12, m.n43 + m.n13, m.n44 + m.n14);
      this._frustum[2].set(m.n41 + m.n21, m.n42 + m.n22, m.n43 + m.n23, m.n44 + m.n24);
      this._frustum[3].set(m.n41 - m.n21, m.n42 - m.n22, m.n43 - m.n23, m.n44 - m.n24);
      this._frustum[4].set(m.n41 - m.n31, m.n42 - m.n32, m.n43 - m.n33, m.n44 - m.n34);
      this._frustum[5].set(m.n41 + m.n31, m.n42 + m.n32, m.n43 + m.n33, m.n44 + m.n34);
      _results = [];
      for (i = 0; i <= 5; i++) {
        plane = this._frustum[i];
        _results.push(plane.divideScalar(Math.sqrt(plane.x * plane.x + plane.y * plane.y + plane.z * plane.z)));
      }
      return _results;
    };
    Frustum.prototype.contains = function(object) {
      var distance, i, matrix, radius;
      matrix = object.matrixWorld;
      radius = -object.geometry.boundingSphere.radius * Math.max(object.scale.x, Math.max(object.scale.y, object.scale.z));
      for (i = 0; i <= 5; i++) {
        distance = this._frustum[i].x * matrix.n14 + this._frustum[i].y * matrix.n24 + this._frustum[i].z * matrix.n34 + this._frustum[i].w;
        if (distance <= radius) {
          return false;
        }
      }
      return true;
    };
    Frustum.prototype.update = function(camera) {
      this._projScreenMatrix.multiply(camera.projectionMatrix, camera.matrixWorldInverse);
      return this.computeFrustum(this._projScreenMatrix);
    };
    return Frustum;
  })();
  Miru.Frustum = Frustum;
  MapAnimation = (function() {
    function MapAnimation(map, grid) {
      var i, j, xdiv, ydiv, _ref, _ref2;
      this.map = map;
      this.steps = grid.x * grid.y;
      xdiv = 1.0 / grid.x;
      ydiv = 1.0 / grid.y;
      this.map.repeat.set(xdiv, ydiv);
      this._offsets = [];
      for (i = 0, _ref = grid.y - 1; 0 <= _ref ? i <= _ref : i >= _ref; 0 <= _ref ? i++ : i--) {
        for (j = 0, _ref2 = grid.x - 1; 0 <= _ref2 ? j <= _ref2 : j >= _ref2; 0 <= _ref2 ? j++ : j--) {
          this._offsets.push([0.0 + xdiv * j, 0.0 + ydiv * i]);
        }
      }
      this._offsets = new Util.Cycle(this._offsets);
    }
    MapAnimation.prototype.animate = function() {
      var o;
      o = this._offsets.next();
      return this.map.offset.set(o[0], o[1]);
    };
    return MapAnimation;
  })();
  Miru.MapAnimation = MapAnimation;
  SoundManager = (function() {
    SoundManager._default_options = {
      url: '../lib/',
      flashVersion: 9,
      useHTML5Audio: true,
      useFlashBlock: false,
      debugMode: false,
      soundUrls: f(function() {
        return {};
      }),
      onloadCallback: function() {
        return null;
      }
    };
    function SoundManager(parameters) {
      var options;
      if (parameters == null) {
        parameters = {};
      }
      this.onload = __bind(this.onload, this);
      options = {};
      console.log("parameters " + parameters.soundUrls);
      bindnames(options, parameters, SoundManager._default_options);
      soundManager.url = options.url;
      soundManager.flashVersion = options.flashVersion;
      soundManager.useHTML5Audio = options.useHTML5Audio;
      soundManager.useFlashBlock = options.useFlashBlock;
      soundManager.debugMode = options.debugMode;
      soundManager.onload = this.onload;
      this.onloadCallback = options.onloadCallback;
      this.soundUrls = options.soundUrls;
      this.sounds = {};
    }
    SoundManager.prototype.onload = function() {
      var id, sound, url, _ref;
      console.log("onload for soundmanager called");
      _ref = this.soundUrls;
      for (id in _ref) {
        url = _ref[id];
        console.log("registering url " + url + " with id " + id);
        sound = soundManager.createSound({
          id: id,
          url: url
        });
        this.sounds[id] = sound;
      }
      this.onloadCallback(this);
      return delete this.soundUrls;
    };
    return SoundManager;
  })();
  Miru.SoundManager = SoundManager;
  window.Miru = Miru;
}).call(this);
