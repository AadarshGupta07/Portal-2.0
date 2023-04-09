import './style.css'
import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import { Pane } from 'tweakpane';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import * as EssentialsPlugin from '@tweakpane/plugin-essentials';

import lightMapFragmentShader from './shaders/lightMap/fragment.glsl'
import lightMapVertexShader from './shaders/lightMap/vertex.glsl'

import firefliesVertexShader from './shaders/fireflies/vertex.glsl'
import firefliesFragmentShader from './shaders/fireflies/fragment.glsl'

/**
 * Base
 */
// GLTF loader
const gltfLoader = new GLTFLoader()

// Debug
const pane = new Pane();
pane.containerElem_.style.width = '280px'
pane.registerPlugin(EssentialsPlugin);

const fpsGraph = pane.addBlade({
    view: 'fpsgraph',
    label: 'fpsgraph',
})

const portalFolder = pane.addFolder({ title: 'Portal Tweaks' });
const poleFolder = pane.addFolder({ title: 'Pole Tweaks' });

// Canvas
const canvas = document.querySelector('canvas.webgl')

// Scene
const scene = new THREE.Scene()

/**
 * Sizes
 */
const sizes = {
    width: window.innerWidth,
    height: window.innerHeight
}

window.addEventListener('resize', () => {
    // Update sizes
    sizes.width = window.innerWidth
    sizes.height = window.innerHeight

    // Update camera
    camera.aspect = sizes.width / sizes.height
    camera.updateProjectionMatrix()

    // Update renderer
    renderer.setSize(sizes.width, sizes.height)
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
})

/***
 *  Lights
 */
// Ambient Light
const light = new THREE.AmbientLight(0x000000, 1); // soft white light
scene.add(light);

/**
 * Camera
 */
// Base camera
const camera = new THREE.PerspectiveCamera(75, sizes.width / sizes.height, 0.1, 1000)
camera.position.x = 10
camera.position.y = 5
camera.position.z = 10
scene.add(camera)

// Controls
const controls = new OrbitControls(camera, canvas)
controls.enableDamping = true
controls.dampingFactor = 0.04
controls.minDistance = 5
controls.maxDistance = 60
controls.enableRotate = true
controls.enableZoom = true
controls.maxPolarAngle = Math.PI / 2.5


const sceneParams = {
    sceneColor: '#ffffff',
    rStrength: 0.3,
    PortalColor: '#04BCBD',
    gStrength: 0.3,
    PoleColor: '#FFF200',
    portalColorStart: '#007aff',
    portalColorEnd: '#0041ff',
    pointSize: 0.1
}

/**
 *  Texture Loader
 */
const textureLoader = new THREE.TextureLoader()
const bakedTexture = textureLoader.load('BakedMap.jpg')
bakedTexture.flipY = false
bakedTexture.encoding = THREE.sRGBEncoding

const RGBTexture = textureLoader.load('LightMap.jpg')
RGBTexture.flipY = false
RGBTexture.encoding = THREE.sRGBEncoding

const lightMapMaterial = new THREE.ShaderMaterial({
    vertexShader: lightMapVertexShader,
    fragmentShader: lightMapFragmentShader,
    uniforms:
    {
        uTime: { value: 0 },
        uPortalStrenght: { value: sceneParams.rStrength },
        uColor: { value: new THREE.Color('#04BCBD') },
        uPoleStrenght: { value: sceneParams.gStrength },
        uPoleColor: { value: new THREE.Color('#FFF200') },
        uBakedTexture: { value: bakedTexture },
        uLightMapTexture: { value: RGBTexture }
    },
    wireframe: false
})


/**
 *  Model
 */
let poleLightMaterial = new THREE.MeshBasicMaterial({ color: sceneParams.PoleColor, transparent: true, opacity: 1 })

let m = new THREE.PointsMaterial({
    color: sceneParams.PortalColor,
    size: sceneParams.pointSize,
    transparent: true,
});
let p;
gltfLoader.load(
    'model.glb',
    (gltf) => {
        const bakedMesh = gltf.scene.children.find((child) => {
            return child.name === 'bakedMesh'
        })
        bakedMesh.material = lightMapMaterial

        const discFront = gltf.scene.children.find((child) => {
            return child.name === 'Disc-front'
        })
        // discFront.material = portalDiscMaterial

        const discBack = gltf.scene.children.find((child) => {
            return child.name === 'Disc-back'
        })
        // discBack.material = portalDiscMaterial

        const bulbL1 = gltf.scene.children.find((child) => {
            return child.name === 'bulb-l1'
        })
        bulbL1.material = poleLightMaterial

        const bulbL2 = gltf.scene.children.find((child) => {
            return child.name === 'bulb-l2'
        })
        bulbL2.material = poleLightMaterial

        const bulbR1 = gltf.scene.children.find((child) => {
            return child.name === 'bulb-r1'
        })
        bulbR1.material = poleLightMaterial

        const bulbR2 = gltf.scene.children.find((child) => {
            return child.name === 'bulb-r2'
        })
        bulbR2.material = poleLightMaterial
        scene.add(bakedMesh, bulbL1, bulbL2, bulbR1, bulbR2)

        let points = [];
        let vec_3 = new THREE.Vector3();
        let pos = discFront.geometry.attributes.position;
        for (let i = 0; i < pos.count; i++) {
            vec_3.fromBufferAttribute(pos, i);
            points.push(vec_3.clone());
        }


        // Dat GUI
        const parameters = {
            pointsDensity: 1.0,
        };

        let g = new THREE.BufferGeometry().setFromPoints(points);
        g.center();


        p = new THREE.Points(g, m);
        p.name = 'points';

        scene.add(p);

        p.position.copy(discFront.position)
        p.rotation.copy(discFront.rotation)

        portalFolder.addInput(parameters, 'pointsDensity', { label: 'PortalDensity', min: 0, max: 1, step: 0.0001 }).on('change', () => {
            // Randomly remove 50% of the points
            const filteredPoints = points.filter(() => Math.random() < parameters.pointsDensity);
            let g = new THREE.BufferGeometry().setFromPoints(filteredPoints);

            g.center();

            let p = new THREE.Points(g, m);
            scene.remove(scene.getObjectByName('points'));
            p.name = 'points';
            p.position.copy(discFront.position)
            p.rotation.copy(discFront.rotation)
            scene.add(p);
        });

        portalFolder.addInput(sceneParams, 'pointSize', { label: 'pointSize', min: 0, max: 0.3, step: 0.001 }).on('change', () => {
            m.size = sceneParams.pointSize
        })

    }
)

/**
 * Fireflies
 */
let fliesHorizantalSpreadDistance = 20
let fliesVerticalSpreadDistance = 8.0
const firefliesCount = 100

//geometry
const firefliesGeometry = new THREE.BufferGeometry()
const positionArray = new Float32Array(firefliesCount * 3)
const scaleArray = new Float32Array(firefliesCount)
for (let i = 0; i < firefliesCount; i++) {
    positionArray[i * 3 + 0] = (Math.random() - 0.5) * fliesHorizantalSpreadDistance
    positionArray[i * 3 + 1] = Math.random() * fliesVerticalSpreadDistance
    positionArray[i * 3 + 2] = (Math.random() - 0.5) * fliesHorizantalSpreadDistance

    scaleArray[i] = Math.random()
}

firefliesGeometry.setAttribute('position', new THREE.BufferAttribute(positionArray, 3))
firefliesGeometry.setAttribute('aScale', new THREE.BufferAttribute(scaleArray, 1))

const firefliesMaterial = new THREE.ShaderMaterial({
    uniforms:
    {
        uTime: { value: 0 },
        uPixelRatio: { value: Math.min(window.devicePixelRatio, 2) },
        uSize: { value: 140 }
    },
    vertexShader: firefliesVertexShader,
    fragmentShader: firefliesFragmentShader,
    transparent: true,
    blending: THREE.AdditiveBlending,
    depthWrite: false
})

const fireflies = new THREE.Points(firefliesGeometry, firefliesMaterial)
scene.add(fireflies)

/**
 * Renderer
 */
const renderer = new THREE.WebGLRenderer({
    canvas: canvas,
    antialias: true
})
renderer.setSize(sizes.width, sizes.height)
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
renderer.setClearColor(0x18142c, 1);

/**
 *  Gui 
 */

// add a folder for the scene background color
const Scenefolder = pane.addFolder({ title: 'General Tweaks' });

Scenefolder.addInput(sceneParams, 'sceneColor').on('change', () => {
    const color = new THREE.Color(sceneParams.sceneColor);
    scene.background = color;
});


/**
 *  Portal Tweaks
 */
// To Control Portal Lights Strength
let rStrength = portalFolder.addInput(
    sceneParams, 'rStrength',
    { label: 'PortalStrength', min: 0.3, max: 1.0, step: 0.001 }
);
rStrength.on('change', () => {
    lightMapMaterial.uniforms.uPortalStrenght.value = sceneParams.rStrength
    const color = new THREE.Color(sceneParams.PortalColor);
    lightMapMaterial.uniforms.uColor.value = color;
    m.color = color
});
// To Control Portal Lights Color
portalFolder.addInput(sceneParams, 'PortalColor', { label: 'PortalColor' }).on('change', () => {
    lightMapMaterial.uniforms.uPortalStrenght.value = sceneParams.rStrength
    const color = new THREE.Color(sceneParams.PortalColor);
    lightMapMaterial.uniforms.uColor.value = color;
    m.color = color

});

/**
 *  Pole Tweaks
 */
// To Control Pole Lights Strength
let gStrength = poleFolder.addInput(
    sceneParams, 'gStrength',
    { label: 'PoleStrength', min: 0.3, max: 1.0, step: 0.001 }
);
gStrength.on('change', () => {
    lightMapMaterial.uniforms.uPoleStrenght.value = sceneParams.gStrength
    const color2 = new THREE.Color(sceneParams.PoleColor);
    lightMapMaterial.uniforms.uPoleColor.value = color2;
    poleLightMaterial.color = color2;
});
// To Control Pole Lights Color
poleFolder.addInput(sceneParams, 'PoleColor', { label: 'BulbColor' }).on('change', () => {
    lightMapMaterial.uniforms.uPoleStrenght.value = sceneParams.gStrength
    const color2 = new THREE.Color(sceneParams.PoleColor);
    lightMapMaterial.uniforms.uPoleColor.value = color2;
    poleLightMaterial.color = color2;
});

/**
 * Animate
 */

// set up variables for animation
let position = 0;
const speed = 0.01;
const amplitude = 0.2;

const clock = new THREE.Clock()
let lastElapsedTime = 0

const tick = () => {
    fpsGraph.begin()

    const elapsedTime = clock.getElapsedTime()
    const deltaTime = elapsedTime - lastElapsedTime
    lastElapsedTime = elapsedTime

    if (p) {
        p.rotation.x += -deltaTime * 0.05
        // // update the position of the plane
        // position += speed;
        // const displacement = Math.sin(position) + amplitude;
        // p.position.x = displacement-2.5;
    }
    firefliesMaterial.uniforms.uTime.value = elapsedTime


    // Update controls
    controls.update()

    // Render
    renderer.render(scene, camera)

    fpsGraph.end()

    // Call tick again on the next frame
    window.requestAnimationFrame(tick)
}

tick()