// ============= 3D RENDERER =============
class Renderer3D {
    constructor(canvas) {
        this.canvas = canvas;
        this.scene = null;
        this.camera = null;
        this.renderer = null;
        this.controls = null;
        this.voxels = new Map(); // Map of "x,y,z" -> {x, y, z, color}
        this.mainMesh = null; // Single InstancedMesh for all voxels
        this.voxelSize = 8;
        this.spacing = 10;
        this.initialized = false;
        this.batchMode = false; // For batch updates
        this.needsRebuild = false;
        this.frameCount = 0;
        this.sceneBuildStartFrame = 0;
        this.userInteracted = false;
        this.stats = null;
    }

    setStats(stats) {
        this.stats = stats;
    }

    init(voxelSize = 8, spacing = 10) {
        this.voxelSize = voxelSize;
        this.spacing = spacing;

        if (!this.initialized) {
            // Ensure canvas has dimensions
            if (this.canvas.width === 0 || this.canvas.height === 0) {
                this.canvas.width = this.canvas.clientWidth || 600;
                this.canvas.height = this.canvas.clientHeight || 400;
            }

            // Setup scene
            this.scene = new THREE.Scene();
            this.scene.background = new THREE.Color(0x1a1a1a);

            // Setup camera
            this.camera = new THREE.PerspectiveCamera(
                75,
                this.canvas.clientWidth / this.canvas.clientHeight,
                0.1,
                10000
            );
            this.camera.position.set(50, 50, 50);
            this.camera.lookAt(0, 0, 0);

            // Setup renderer
            this.renderer = new THREE.WebGLRenderer({ canvas: this.canvas, antialias: true });
            this.renderer.setSize(this.canvas.clientWidth, this.canvas.clientHeight);

            // Setup lights - better lighting setup
            const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
            this.scene.add(ambientLight);

            // Hemisphere light for better ambient lighting
            const hemiLight = new THREE.HemisphereLight(0xffffff, 0x444444, 0.4);
            hemiLight.position.set(0, 100, 0);
            this.scene.add(hemiLight);

            // Main directional light
            const directionalLight1 = new THREE.DirectionalLight(0xffffff, 0.8);
            directionalLight1.position.set(50, 50, 50);
            this.scene.add(directionalLight1);

            // Fill light from opposite side
            const directionalLight2 = new THREE.DirectionalLight(0xffffff, 0.4);
            directionalLight2.position.set(-50, 20, -50);
            this.scene.add(directionalLight2);

            // Setup controls
            this.controls = new THREE.OrbitControls(this.camera, this.canvas);
            this.controls.enableDamping = true;
            this.controls.dampingFactor = 0.05;
            this.controls.addEventListener('start', () => {
                this.userInteracted = true;
            });

            this.initialized = true;
            this.animate();

            // Clear voxels and reset camera positioning on first init
            this.clear();
            this.cameraAutoPositioned = false;
        } else {
            // If already initialized, clear and update parameters
            this.voxelSize = voxelSize;
            this.spacing = spacing;
            this.clear();
            // Don't reset userInteracted here to preserve manual adjustments if just resizing/re-initing without full clear logic
            // But clear() calls it anyway, so it depends on intent. 
            // Actually, init() is usually called once or on full reset.
            this.sceneBuildStartFrame = this.frameCount;
            // Don't rebuild yet, let voxels be added first
        }
    }

    animate() {
        if (!this.initialized) return;

        if (this.stats) this.stats.begin();

        this.frameCount++;

        requestAnimationFrame(() => this.animate());

        // Rebuild meshes if needed (batched updates)
        if (this.needsRebuild) {
            this.rebuildMeshes();
            this.needsRebuild = false;
        }

        if (this.controls) {
            this.controls.update();
        }

        if (this.renderer && this.scene && this.camera) {
            this.renderer.render(this.scene, this.camera);
        }

        if (this.stats) this.stats.end();
    }

    setVoxel(x, y, z, color) {
        const key = `${x},${y},${z}`;
        this.voxels.set(key, { x, y, z, color });

        if (this.batchMode) {
            this.needsRebuild = true;
        } else {
            this.rebuildMeshes();
        }
    }

    removeVoxel(x, y, z) {
        const key = `${x},${y},${z}`;
        this.voxels.delete(key);

        if (this.batchMode) {
            this.needsRebuild = true;
        } else {
            this.rebuildMeshes();
        }
    }

    getVoxel(x, y, z) {
        const key = `${x},${y},${z}`;
        const voxel = this.voxels.get(key);
        return voxel ? voxel.color : null;
    }

    clear(resetCamera = true) {
        this.voxels.clear();
        if (resetCamera) {
            this.sceneBuildStartFrame = this.frameCount;
        }
        this.userInteracted = false;

        if (this.batchMode) {
            this.needsRebuild = true;
        } else {
            this.rebuildMeshes();
        }
    }

    beginBatch() {
        this.batchMode = true;
    }

    endBatch() {
        this.batchMode = false;
        if (this.needsRebuild) {
            this.rebuildMeshes();
            this.needsRebuild = false;
        }
    }

    rebuildMeshes() {
        if (!this.initialized) return; // Don't rebuild if not initialized

        // Remove old mesh
        if (this.mainMesh) {
            this.scene.remove(this.mainMesh);
            this.mainMesh.geometry.dispose();
            this.mainMesh.material.dispose();
            this.mainMesh = null;
        }

        if (this.voxels.size === 0) return;

        // Calculate bounding box for camera positioning
        let minX = Infinity, minY = Infinity, minZ = Infinity;
        let maxX = -Infinity, maxY = -Infinity, maxZ = -Infinity;

        // Iterate over values directly to avoid string parsing
        for (const voxel of this.voxels.values()) {
            const wx = voxel.x * this.spacing;
            const wy = voxel.y * this.spacing;
            const wz = voxel.z * this.spacing;
            minX = Math.min(minX, wx);
            minY = Math.min(minY, wy);
            minZ = Math.min(minZ, wz);
            maxX = Math.max(maxX, wx);
            maxY = Math.max(maxY, wy);
            maxZ = Math.max(maxZ, wz);
        }

        // Calculate center and size
        const centerX = (minX + maxX) / 2;
        const centerY = (minY + maxY) / 2;
        const centerZ = (minZ + maxZ) / 2;
        const sizeX = maxX - minX;
        const sizeY = maxY - minY;
        const sizeZ = maxZ - minZ;
        const maxSize = Math.max(sizeX, sizeY, sizeZ);

        // Position camera only during initial build phase and if user hasn't moved it
        if (!this.userInteracted && this.frameCount === this.sceneBuildStartFrame) {
            const distance = Math.max(maxSize * 2, 100); // Ensure minimum distance
            this.camera.position.set(
                centerX + distance * 0.7,
                centerY + distance * 0.7,
                centerZ + distance * 0.7
            );
            this.controls.target.set(centerX, centerY, centerZ);
            this.controls.update();
        }

        // Create single instanced mesh for all voxels
        const geometry = new THREE.BoxGeometry(this.voxelSize, this.voxelSize, this.voxelSize);
        // Use white material so instance colors show up correctly
        const material = new THREE.MeshLambertMaterial({ color: 0xffffff });

        this.mainMesh = new THREE.InstancedMesh(geometry, material, this.voxels.size);
        this.mainMesh.frustumCulled = false; // Disable culling to ensure instances are visible even if origin is out of view

        const matrix = new THREE.Matrix4();
        const color = new THREE.Color();

        let i = 0;
        for (const voxel of this.voxels.values()) {
            matrix.setPosition(
                voxel.x * this.spacing,
                voxel.y * this.spacing,
                voxel.z * this.spacing
            );
            this.mainMesh.setMatrixAt(i, matrix);

            color.set(voxel.color);
            this.mainMesh.setColorAt(i, color);

            i++;
        }

        this.mainMesh.instanceMatrix.needsUpdate = true;
        if (this.mainMesh.instanceColor) this.mainMesh.instanceColor.needsUpdate = true;

        this.scene.add(this.mainMesh);
    }

    resize() {
        if (!this.initialized) return;

        const width = this.canvas.clientWidth;
        const height = this.canvas.clientHeight;

        this.camera.aspect = width / height;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(width, height);
    }
}

