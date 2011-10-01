Miru = if Miru is undefined then {} else Miru

f = Util.f
bindnames = Util.bindnames
removeFromArray = Util.removeFromArray
Vector3 = THREE.Vector3
Miru.DEBUG = true

DEBUG = Miru.DEBUG

vertex = (x,y,z) ->
    return new THREE.Vertex(new THREE.Vector3(x,y,z))

Miru.vertex = vertex


class World

    @defaults: {
        camera: f(() -> CameraUtils.positioned())
        renderer: f(() -> World._defaultRenderer())
        lights: f(() -> [])
        addstats: false
        screenwidth: null
        screenheight: null
        playerStats: f(()->{})
        scene: f(() -> World._defaultScene())
        osd: false
    }

    constructor: (parameters={}) ->

        bindnames(this, parameters, World.defaults)

        @mouse = { x: 0, y: 0 }
        @scenes = []
        @scenes.push @scene
        @cameras = []
        @cameras.push @camera
        @objects = []

        for light in @lights
            @scene.addLight(light)
        delete this.lights

        @last = null
        @stats = null
        @resizables = []
        @_scheduled_remove = []

        if @osd
            @osd_scene = new THREE.Scene()
            @osd_scene.addLight(new THREE.AmbientLight(0xffffff))
            window.osd_scene = @osd_scene
            @osd_camera = Miru.CameraUtils.osd()
            @addScene(@osd_scene, @osd_camera)
        delete this.osd

        @_projector = new THREE.Projector()

        @setUp()

        if @debug

            xzplane = new Miru.DebugXZPlane({min: -30000, max: 30000})
            @addObject xzplane
            setInterval @debugF, 5000


    setPrimaryCamera: (camera) ->
        @cameras[0] = camera
        @camera = camera

    setPrimaryScene: (scene) ->
        @scenes[0] = scene
        @scene = scene

    @_defaultScene: ->
        return new THREE.Scene()

    @_defaultRenderer: ->
        renderer = new THREE.WebGLRenderer()
        renderer.autoClear = false
        return renderer

    addScene: (scene, camera) ->
        @scenes.push scene
        @cameras.push camera

    addObject: (object, scene=null) ->
        if scene is null
            scene = @scene

        @objects.push object
        object.world = this

        for renderable in object.renderables
            renderable.gameObject = object
            scene.addChild renderable

        if object.resizable
            @resizables.push object


    removeObject: (object, scene=null) ->

        if scene is null
            scene = @scene
        @_scheduled_remove.push [object, scene]


    _removeObject: (object, scene) ->
        removeFromArray(@objects, object)

        for renderable in object.renderables
            scene.removeObject renderable

        if object.resizable
            removeFromArray(@resizables, object)



    activate: () ->

        @container = document.createElement('div')
        @activateRenderer()
        @attachEventListeners()
        document.body.appendChild(@container)
        @activated = true
        @animate()



    deactivate: () ->
        # todo - remove dom element etc
        @activated = false


    activateRenderer: () ->

        if @screenwidth is null
            @resize(window.innerWidth, window.innerHeight)

        else
            @resize(@screenwidth, @screenheight)

        if @addstats

            @stats = stats = new Stats()
            stats.domElement.style.position = "absolute"
            stats.domElement.style.top = "0px"
            @container.appendChild(stats.domElement)

        @container.appendChild( @renderer.domElement )

    attachEventListeners: () ->
        for name of this
            if name.substring(0,10) == 'onDocument'
                eventname = name.substring(10).toLowerCase()
                window.document.addEventListener(eventname, this[name])

    resize: (w, h) ->

        @renderer.setSize(w, h)
        @screenwidth = w
        @screenheight = h

        for o in @resizables
            o.resize(w, h)


    update: () ->

        seconds = new Date().getTime() * 0.001

        if @last is null
            @last = seconds

        dt = seconds - @last
        dt = Math.min(dt, 0.2)

        for o in @objects
            o.update(seconds, dt)

        @last = seconds

        for pair in @_scheduled_remove
            object = pair[0]
            scene = pair[1]
            @_removeObject(object, scene)
        @_scheduled_remove = []


    animate: =>

        requestAnimationFrame @animate

        @update()
        @renderer.clear()

        for scene, index in @scenes

            if scene
                c = @cameras[index]
                @renderer.render(scene, c)

                if c.frustum
                    c.frustum.update(c)

        if @stats
            @stats.update()


    render: (args...) ->

        @renderer.render(args...)

    onDocumentMouseMove: (event) =>
        event.preventDefault()
        @mouse.x = ( event.clientX / @screenwidth) * 2 - 1
        @mouse.y = - ( event.clientY / @screenheight) * 2 + 1


    raycastMouse: (scene=null, camera=null) ->
        if scene is null
            scene = @scene
            camera = @camera
        vector = new THREE.Vector3( @mouse.x, @mouse.y, 0.5 )
        @_projector.unprojectVector( vector, camera )
        ray = new THREE.Ray( camera.position, vector.subSelf( camera.position ).normalize() )
        intersects = ray.intersectScene( scene )
        return ( mesh.object.gameObject for mesh in intersects )

    setUp: () ->


Miru.World = World


class GameObject

    resizable: false
    constructor: (@renderables=[]) ->
    update: (seconds, dt) ->
    world: null


Miru.GameObject = GameObject



class SSCameraTrack extends GameObject
    ###
    A side scrolling camera track.
    ###

    resizable: true
    @_defaults: {
        marginx: 0.21
        marginy: 0.21
        trackz: false
        center: false
    }

    constructor: (@camera, @target, parameters={}) ->
        ###
        Give me a camera and a target mesh to follow and I'll follow it
        within marginx and marginy of the screen horinzontally and vertically.
        Margin x an y are a percentage of the screen width or height given as float
        in the range [0,1]


        This assumes of course the camera is looking parallel to the z-axis with
        up vector also parallel to z-axis.
        ###

        super []
        bindnames(this, parameters, SSCameraTrack._defaults)
        @_cache = [0,0,0]
        @_projector = new THREE.Projector()
        @_w = null
        @_h = null


    update: (seconds, dt) ->

        x = @target.position.x
        y = @target.position.y
        z = @target.position.z

        if [x,y,z] == @_cache
            return

        deltax = x - @_cache[0]
        deltay = y - @_cache[1]
        deltaz = z - @_cache[2]
        if @center
            @camera.position.x += deltax
            @camera.position.y += deltay
            @camera.target.position.x += deltax
            @camera.target.position.y += deltay
        if @trackz
            @camera.position.z += deltaz
            @camera.target.position.z += deltaz
        @_cache = [ x, y, z ]
        if @center
            return
        v = @target.position.clone()
        @_projector.projectVector(v, @camera)
        sx = @_w/2 - v.x * @_w/2
        sy = @_h/2 - v.y * @_h/2

        if sx < @_edgex or sx > (@_w - @_edgex)
            @camera.position.x += deltax
            @camera.target.position.x += deltax

        if sy < @_edgey or sy > (@_h - @_edgey)
            @camera.position.y += deltay
            @camera.target.position.y += deltay

    resize: (@_w, @_h) ->
        if Miru.DEBUG
            console.log "<SSCameraTrack> resizing w=" + @_w + " h=" + @_h
        @_edgex = @_w * @marginx
        @_edgey = @_h * @marginy


Miru.SSCameraTrack = SSCameraTrack




class VideoPlane extends GameObject

    @_defaults: {
        width: 100
        height: 100
        segmentsWidth: 4
        segmentsHeight: 4
        position: f(()->new THREE.Vector3(0,0,0))
        videoElement: null
        videoSelector: 'video'
        scale: 1
        play: false
    }

    constructor: (parameters={}) ->

        super []
        options = {}
        bindnames(options, parameters, VideoPlane._defaults)

        if options.videoElement is null
            options.videoElement = document.getElementById(options.videoSelector)
        @video = options.videoElement

        if options.play

            @video.play()

        w = options.width
        h = options.height

        image = document.createElement('canvas')
        image.width = w
        image.height = h
        @imageContext = image.getContext('2d')
        @imageContext.fillStyle = '#000000'
        @imageContext.fillRect(0,0,w,h)

        @texture = new THREE.Texture(image)
        @texture.minFilter = THREE.LinearFilter
        @texture.maxFilter = THREE.LinearFilter

        mat = new THREE.MeshBasicMaterial({map:@texture})
        plane = new THREE.PlaneGeometry(w, h, options.segmentsWidth, options.segmentsHeight)
        @mesh = new THREE.Mesh(plane, mat)
        @mesh.scale.x = @mesh.scale.y = @mesh.scale.z = options.scale
        @mesh.overdraw = true
        @mesh.position = options.position
        @renderables.push @mesh


    update: (seconds, dt) ->

        if @video.readyState == @video.HAVE_ENOUGH_DATA
            @imageContext.drawImage(@video, 0, 0)
            @texture.needsUpdate = true


Miru.VideoPlane = VideoPlane


class Collider extends GameObject

    constructor: () ->

        super []
        @objects = []

    add: (obj) ->

        @objects.push obj

    update: (seconds, dt) ->

        l = @objects.length
        for i, o of @objects
            for other in @objects[(i+1)...l]
                if o.collides(other)
                    o.collide(other)
                    other.collide(o)


Miru.Collider = Collider

class LightUtils

    @_smoovdefaults: {
        points: f(() -> [0,100,0])
        color: "0xf0f0f0"
        intensity: 1
    }

    @smoov = (parameters={}) ->
        options = {}
        bindnames(options, parameters, LightUtils._smoovdefaults)
        lights = []
        for point in options.points
            l = new THREE.PointLight(options.colorhex)
            l.position = new Vector3(point[0], point[1], point[2])
            l.intensity = options.intensity
            lights.push l
        return lights


Miru.LightUtils = LightUtils


class CameraUtils

    @_positioned_defaults: {
        position: f(()->new Vector3(0,0,0))
        fov: 33
        near: 1
        far: 100000
    }

    @_fly_defaults: {
        fov: 25
        aspect: window.innerWidth / window.innerHeight
        movementSpeed: 5000
        rollSpeed: Math.PI / 24
        autoForward: false
        dragToLook: true
        near: 50
        far: 1e7
        position: f(() -> new Vector3(100, 1000, 60000))
        quaternion: new THREE.Quaternion 0, 0, 0, 1
    }

    @_osd_defaults: {
        fov: 25
        near: -2000
        far: 1000
        position: f(()->new THREE.Vector3(0,0,500))
    }

    @_firstperson_defaults: {
        fov: 60
        aspect: window.innerWidth / window.innerHeight
        near: 1
        far: 20000
        movementSpeed: 3000
        lookSpeed: 0.25
        noFly: false
        lookVertical: true
        position: f(()->new THREE.Vector3( 0, 1000, 0))
    }

    @positioned: (parameters={}) ->
        options = {}
        bindnames(options, parameters, CameraUtils._positioned_defaults)
        camera = new THREE.Camera(options.fov, window.innerWidth / window.innerHeight, options.near, options.far)
        camera.position = options.position
        return camera

    @fly: (parameters={}) ->
        options = {}
        bindnames(options, parameters, CameraUtils._fly_defaults)
        camera = new THREE.FlyCamera(options)
        camera.position = options.position
        camera.quaternion = options.quaternion
        return camera

    @osd: (parameters={}) ->
        options = {}
        bindnames(options, parameters, CameraUtils._osd_defaults)
        camera = new THREE.Camera( options.fov, window.innerWidth / window.innerHeight, options.near, options.far )
        camera.position = options.position
        camera.projectionMatrix = THREE.Matrix4.makeOrtho( window.innerWidth / - 2, window.innerWidth / 2,
                                                           window.innerHeight / 2, window.innerHeight / - 2,
                                                           options.near, options.far )
        return camera

    @firstperson: (parameters={}) ->
        options = {}
        bindnames(options, parameters, CameraUtils._firstperson_defaults)
        camera = new THREE.QuakeCamera(options)
        camera.position = options.position

        return camera


Miru.CameraUtils = CameraUtils


class MaterialUtils

    @_cache: {}

    @_smoovdefaults: {
        color: 0xf0f0f0
        ambient: 0xf0f0f0
        specular: 0xf0f0f0
        shading: THREE.SmoothShading
        shininess: 1
        opacity: 1
        cache: true
    }

    @smoov: (parameters={}) ->

        options = {}
        bindnames(options, parameters, MaterialUtils._smoovdefaults)
        key = [options.color, options.ambient, options.specular, options.shading, options.shininess, options.opacity]

        if options.cache and key in MaterialUtils._cache

            return MaterialUtils._cache[key]

        v = new THREE.MeshPhongMaterial( {
                ambient:options.ambient
                color:options.color
                specular:options.specular
                shininess:options.shininess
                opacity:options.opacity
                shading:options.shading } )

        if options.cache

            MaterialUtils._cache[key] = v

        return v


Miru.MaterialUtils = MaterialUtils


class TextureUtils

    @textureFaces: (geometry, urls) ->
        window.called_urls = urls
        for face, i in geometry.faces
            face.materials = [ new THREE.MeshLambertMaterial({map:THREE.ImageUtils.loadTexture(urls[i])}) ]

Miru.TextureUtils = TextureUtils



class GeometryUtils

    @CUBE: 1
    @LINE: 2
    @_cache: {}

    @_cubedefaults : {
        w: 200
        h: 200
        d: 200
        cache: true
    }

    @cube: (parameters={}) ->

        options = {}
        bindnames(options, parameters, GeometryUtils._cubedefaults)
        key = [GeometryUtils.CUBE, options.w, options.h, options.d]

        if options.cache and key in GeometryUtils._cache

            return GeometryUtils._cache[key]

        v = new THREE.CubeGeometry(options.w, options.h, options.d)

        if options.cache
            GeometryUtils._cache[key] = v

        return v


Miru.GeometryUtils = GeometryUtils


class RandomUtils

    @choose: (array) ->
        return array[Math.floor(array.length * Math.random())]

Miru.RandomUtils = RandomUtils


class DebugXZPlane extends GameObject

    @defaults: {
        color: 0xe0e0e0
        min: -5000
        max: 5000
        intervals: 20
        xcolor: 0x20e020
        ycolor: 0x20e0e0
        zcolor: 0xe02020
        drawaxes: true
    }

    constructor: (parameters={}) ->

        options = {}
        bindnames(options, parameters, DebugXZPlane.defaults)
        super []
        planeColor = options.color
        min = options.min
        max = options.max
        intervals = options.intervals
        s = options.max - options.min
        xc = options.xcolor
        yc = options.ycolor
        zc = options.zcolor
        xzplane = new THREE.PlaneGeometry(s,s,20,20)
        planeMaterial = new THREE.MeshBasicMaterial({color:0xe0e0e0, opacity:1, wireframe:true})
        lineMaterials = ( new THREE.LineBasicMaterial({color:c, opacity:1, linewidth:5}) for c in [xc,yc,zc] )
        @mesh = new THREE.Mesh(xzplane, planeMaterial)
        @mesh.rotation.x = Math.PI / 2
        @renderables.push @mesh

        if options.drawaxes
            # And lines for each axis
            xlineGeom = new THREE.Geometry()
            xlineGeom.vertices.push vertex(-90000,0,0)
            xlineGeom.vertices.push vertex(90000,0,0)
            mesh = new THREE.Line(xlineGeom, lineMaterials[0])
            @renderables.push mesh
            ylineGeom = new THREE.Geometry()
            ylineGeom.vertices.push vertex(0,-90000,0)
            ylineGeom.vertices.push vertex(0,90000,0)
            mesh = new THREE.Line(ylineGeom, lineMaterials[1])
            @renderables.push mesh
            zlineGeom = new THREE.Geometry()
            zlineGeom.vertices.push vertex(0,0,-90000)
            zlineGeom.vertices.push vertex(0,0,90000)
            mesh = new THREE.Line(zlineGeom, lineMaterials[2])
            @renderables.push mesh

Miru.DebugXZPlane = DebugXZPlane


class DebugLight extends GameObject

    @defaults: {
        "polematerial": new THREE.LineBasicMaterial({color:0xf0f0a0, wireframe:true, opacity:0.5, linewidth:3})
        "bulbmaterial": new THREE.MeshBasicMaterial({color:0xf0f0a0, opacity:0.5})
    }

    constructor: (light, parameters={}) ->
        super []
        options = {}
        bindnames(options, parameters, DebugLight.defaults)
        @light = light
        lpos = light.position
        polegeom = new THREE.Geometry()
        polegeom.vertices.push vertex(0, 0, 0)
        polegeom.vertices.push vertex(0, lpos.y - 48, 0)
        polemat = options.polematerial
        @polemesh = new THREE.Line(polegeom, polemat)
        @polemesh.position.x = lpos.x
        @polemesh.position.z = lpos.z
        bulbgeom = new THREE.SphereGeometry(50)
        bulbmat = options.bulbmat
        @bulbmesh = new THREE.Mesh(bulbgeom, bulbmat)
        @bulbmesh.position = lpos.clone()

        @renderables.push @polemesh
        @renderables.push @bulbmesh


    update: (seconds, dt) ->

        lpos = @light.position
        bpos = @bulbmesh.position

        if lpos.x != bpos.x or lpos.y != bpos.y or lpos.z != bpos.z

            ppos = @polemesh.position
            ppos.x = lpos.x
            ppos.z = lpos.z

            if bpos.y != lpos.y

                @polemesh.geometry.vertices[1].position.y = lpos.y - 48
                @polemesh.geometry.__dirtyVertices = true

            bpos.x = lpos.x
            bpos.y = lpos.y
            bpos.z = lpos.z



Miru.DebugLight = DebugLight



class Frustum

    constructor: () ->
        @_called = 0
        @_frustum = [
            new THREE.Vector4(),
            new THREE.Vector4(),
            new THREE.Vector4(),
            new THREE.Vector4(),
            new THREE.Vector4(),
            new THREE.Vector4()
        ]
        @_projScreenMatrix = new THREE.Matrix4()

    computeFrustum: (m) ->

        @_frustum[ 0 ].set( m.n41 - m.n11, m.n42 - m.n12, m.n43 - m.n13, m.n44 - m.n14 )
        @_frustum[ 1 ].set( m.n41 + m.n11, m.n42 + m.n12, m.n43 + m.n13, m.n44 + m.n14 )
        @_frustum[ 2 ].set( m.n41 + m.n21, m.n42 + m.n22, m.n43 + m.n23, m.n44 + m.n24 )
        @_frustum[ 3 ].set( m.n41 - m.n21, m.n42 - m.n22, m.n43 - m.n23, m.n44 - m.n24 )
        @_frustum[ 4 ].set( m.n41 - m.n31, m.n42 - m.n32, m.n43 - m.n33, m.n44 - m.n34 )
        @_frustum[ 5 ].set( m.n41 + m.n31, m.n42 + m.n32, m.n43 + m.n33, m.n44 + m.n34 )


        for i in [0..5]
            plane = @_frustum[ i ]
            plane.divideScalar( Math.sqrt( plane.x * plane.x + plane.y * plane.y + plane.z * plane.z ) )


    contains: (object) ->

        matrix = object.matrixWorld
        radius = - object.geometry.boundingSphere.radius * Math.max( object.scale.x, Math.max( object.scale.y, object.scale.z ) )


        for i in [0..5]
            distance = @_frustum[ i ].x * matrix.n14 + @_frustum[ i ].y * matrix.n24 + @_frustum[ i ].z * matrix.n34 + @_frustum[ i ].w
            if distance <= radius
                return false
        return true

    update: (camera) ->
        @_projScreenMatrix.multiply(camera.projectionMatrix, camera.matrixWorldInverse)
        @computeFrustum(@_projScreenMatrix)

Miru.Frustum = Frustum


class MapAnimation

    constructor: (@map, grid) ->
        @steps = grid.x * grid.y
        xdiv = 1.0 / grid.x
        ydiv = 1.0 / grid.y
        @map.repeat.set(xdiv, ydiv)
        @_offsets = []
        for i in [0..(grid.y-1)]
            for j in [0..(grid.x-1)]
                @_offsets.push [0.0 + xdiv * j, 0.0 + ydiv * i]
        @_offsets = new Util.Cycle(@_offsets)

    animate: () ->
        o = @_offsets.next()
        @map.offset.set(o[0], o[1])

Miru.MapAnimation = MapAnimation

class SoundManager

    @_default_options =
        url: '../lib/'
        flashVersion: 9
        useHTML5Audio: true
        useFlashBlock: false
        debugMode: false
        soundUrls: f(()->{}),
        onloadCallback: ()->null

    constructor: (parameters={}) ->
        options = {}
        console.log("parameters #{parameters.soundUrls}")
        bindnames(options, parameters, SoundManager._default_options)
        soundManager.url = options.url
        soundManager.flashVersion = options.flashVersion
        soundManager.useHTML5Audio = options.useHTML5Audio
        soundManager.useFlashBlock = options.useFlashBlock
        soundManager.debugMode = options.debugMode
        soundManager.onload = @onload
        @onloadCallback = options.onloadCallback
        @soundUrls = options.soundUrls
        @sounds = {}

    onload: () =>
        console.log "onload for soundmanager called"
        for id, url of @soundUrls
            console.log "registering url #{url} with id #{id}"
            sound = soundManager.createSound(
                id: id
                url: url
            )
            @sounds[id] = sound
        @onloadCallback(this)
        delete @soundUrls

Miru.SoundManager = SoundManager


window.Miru = Miru

