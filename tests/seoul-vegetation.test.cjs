'use strict';
const test = require('node:test'), assert = require('node:assert/strict');
const fs = require('node:fs'), path = require('node:path'), Module = require('node:module'), ts = require('typescript');
const { SEOUL_REFERENCE_FEATURES, SEOUL_REFERENCE_CAMPUS } = require('../build/core/seoul.js');
const { REFERENCE_CAMPUS } = require('../build/core/campus.js');
const { SEOUL_PATH_TRACES, seoulPavementDistance } = require('../build/core/seoul-paths.js');
const { CAMPUSES } = require('../build/core/campuses.js');
const { createSeoulVegetation, SEOUL_VEGETATION_ZONE_IDS, SEOUL_VEGETATION_NOTE, SEOUL_VEGETATION_SOURCE_URL } = require('../build/core/seoul-vegetation.js');
const filename = path.resolve(__dirname, '../build/core/seoul-vegetation-audit.js');
const loaded = new Module(filename, module); loaded.filename = filename; loaded.paths = Module._nodeModulePaths(path.dirname(filename));
loaded._compile(ts.transpileModule(fs.readFileSync(path.join(__dirname, '../src/scene.ts'), 'utf8') + '\nexport { Geometry };', { compilerOptions: { target: ts.ScriptTarget.ES2020, module: ts.ModuleKind.CommonJS } }).outputText, filename);
const { CampusScene, Geometry, REFERENCE_RENDER_HEIGHT_SCALE } = loaded.exports;
const zones = createSeoulVegetation(SEOUL_REFERENCE_FEATURES, REFERENCE_RENDER_HEIGHT_SCALE);
const plants = zones.flatMap(zone => zone.plants);
const field = SEOUL_REFERENCE_FEATURES.find(f => f.id === 'mju-seoul-field');
const near = (a, b, message) => assert.ok(Math.abs(a - b) < 1e-8, `${message}: ${a} vs ${b}`);
function local(p, f) {
    const x = p.center[0] - f.center[0], z = p.center[1] - f.center[1];
    return [x * Math.cos(f.angle) - z * Math.sin(f.angle), x * Math.sin(f.angle) + z * Math.cos(f.angle)];
}
function rectDistance(x, z, halfWidth, halfDepth) {
    return Math.hypot(Math.max(0, Math.abs(x) - halfWidth), Math.max(0, Math.abs(z) - halfDepth));
}

test('Seoul planting stays inside the seven reviewed areas without becoming a tree inventory', () => {
    assert.deepEqual(zones.map(zone => zone.id), [...SEOUL_VEGETATION_ZONE_IDS]);
    assert.equal(new URL(SEOUL_VEGETATION_SOURCE_URL).hostname, 'news.mju.ac.kr');
    for (const lang of ['en', 'ko', 'zh']) assert.ok(SEOUL_VEGETATION_NOTE[lang].length > 40);
    assert.match(SEOUL_VEGETATION_NOTE.en, /not a surveyed tree inventory/);
    for (const zone of zones) {
        assert.ok(zone.plants.length > 0, `${zone.id} must retain supported planting`);
        assert.ok(SEOUL_REFERENCE_FEATURES.some(f => f.id === zone.anchorId));
        for (const p of zone.plants) {
            assert.ok([...p.center, p.baseY, p.radius, p.height].every(Number.isFinite));
            assert.ok(p.radius > 0 && p.radius < 1 && p.height > 0 && p.height < 3.5);
            assert.ok(Math.abs(p.center[0]) < 55 && p.center[1] > 8 && p.center[1] < 62, 'no invented board-edge forest');
        }
    }
    assert.ok(plants.some(p => p.kind === 'tree') && plants.some(p => p.kind === 'shrub'));
    const evidence = JSON.parse(fs.readFileSync(path.join(__dirname, '../data/seoul-vegetation-evidence.json'), 'utf8'));
    // Evidence schema may expand, but every retained area must remain in the review.
    const text = JSON.stringify(evidence);
    for (const id of SEOUL_VEGETATION_ZONE_IDS) assert.ok(text.includes('"' + id + '"'), `missing evidence for ${id}`);
});

test('entire crowns clear facility envelopes, full pavement shoulders and each other', () => {
    for (const zone of zones) for (const p of zone.plants) {
        assert.ok(seoulPavementDistance(...p.center) > p.radius + 1.5 + .20, `${zone.id} pavement shoulder`);
        for (const f of SEOUL_REFERENCE_FEATURES) {
            if (zone.surface === 'terrace' && f.id === field.id) continue;
            const [x, z] = local(p, f);
            assert.ok(rectDistance(x, z, f.size[0] / 2, f.size[1] / 2) > p.radius + .20, `${zone.id} clears ${f.id}`);
        }
    }
    for (let i = 0; i < plants.length; i++) for (let j = i + 1; j < plants.length; j++) {
        const a = plants[i], b = plants[j];
        assert.ok(Math.hypot(a.center[0] - b.center[0], a.center[1] - b.center[1]) > a.radius + b.radius, 'small canopies remain separate');
    }
});

test('terrace roots follow the fitted field surface and leave every playing line open', () => {
    const mesh = new Geometry(); CampusScene.prototype.referenceModel.call(CampusScene.prototype, mesh, field);
    const green = [0x8c / 255, 0xa7 / 255, 0x77 / 255], surface = [];
    for (let i = 0; i < mesh.data.length; i += 9) {
        const onMargin = Math.abs(mesh.data[i] - field.center[0]) > field.size[0] * .44 || Math.abs(mesh.data[i + 2] - field.center[1]) > field.size[1] * .41;
        // Exclude the slightly raised green center-circle inset; roots use the rim.
        if (onMargin && green.every((v, channel) => Math.abs(mesh.data[i + 6 + channel] - v) < 1e-9)) surface.push(mesh.data[i + 1]);
    }
    assert.ok(surface.length > 0);
    const top = Math.max(...surface);
    for (const zone of zones) for (const p of zone.plants) {
        if (zone.surface === 'ground') { near(p.baseY, -.70, 'ground planting roots'); continue; }
        near(p.baseY, top + .012, 'terrace planting roots');
        const [x, z] = local(p, field);
        // The existing green platform is .97w x .94d; all crowns fit inside it.
        assert.ok(Math.abs(x) + p.radius < field.size[0] * .485);
        assert.ok(Math.abs(z) + p.radius < field.size[1] * .47);
        // Test the complete playing rectangle plus half the .22-wide boundary line.
        assert.ok(rectDistance(x, z, field.size[0] * .44 + .11, field.size[1] * .41 + .11) > p.radius + .15, 'crown does not cover sports surface or lines');
    }
});

test('Seoul renderer uses supported plants at correct levels with finite bounded mesh', () => {
    const crowns = [], bases = [], trunks = [];
    const recorder = { box(...args) { trunks.push(args); }, disk(...args) { bases.push(args); }, segment() {}, crown(...args) { crowns.push(args); } };
    const scene = { referenceCampus: SEOUL_REFERENCE_CAMPUS };
    CampusScene.prototype.seoulTerrain.call(scene, recorder);
    assert.equal(crowns.length, plants.length);
    for (let i = 0; i < plants.length; i++) {
        const p = plants[i], crown = crowns[i];
        near(crown[0], p.center[0], 'rendered plant x'); near(crown[2], p.center[1], 'rendered plant z'); near(crown[3], p.radius, 'rendered crown radius');
        assert.ok(bases.some(([x, y, z, radius]) => x === p.center[0] && z === p.center[1] && y === p.baseY && radius === p.radius), 'root disk rests on correct surface');
        if (p.kind === 'tree') assert.ok(trunks.some(([x, y, z, width]) => x === p.center[0] && z === p.center[1] && y === p.baseY && width < .21), 'tree has a small grounded trunk');
        else assert.ok(crown[4] < .5, 'shrubs remain low');
    }
    const geometry = new Geometry(); CampusScene.prototype.seoulTerrain.call(scene, geometry);
    assert.ok(geometry.data.length > 0 && geometry.data.length < 350000);
    assert.ok(geometry.data.every(Number.isFinite));
});

test('planting is deterministic, cannot affect Yongin and never mutates anchors or navigation data', () => {
    const snapshot = JSON.stringify({ features: SEOUL_REFERENCE_FEATURES, paths: SEOUL_PATH_TRACES, datasets: CAMPUSES });
    assert.deepEqual(createSeoulVegetation(SEOUL_REFERENCE_FEATURES, REFERENCE_RENDER_HEIGHT_SCALE), zones);
    assert.deepEqual(createSeoulVegetation(REFERENCE_CAMPUS.features, REFERENCE_RENDER_HEIGHT_SCALE), []);
    assert.equal(JSON.stringify({ features: SEOUL_REFERENCE_FEATURES, paths: SEOUL_PATH_TRACES, datasets: CAMPUSES }), snapshot);
    for (const name of ['nodes', 'edges', 'entrances', 'buildings', 'rooms']) assert.deepEqual(CAMPUSES.seoul.dataset[name], []);
});
