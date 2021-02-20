/* eslint-disable no-async-promise-executor */
import './style';
import flip from './flip';
import { downloadBlob, blobToBase64 } from './utils.js';
import { useEffect, useRef, useState } from 'preact/hooks';
import { RGBELoader } from 'three-platformize/examples/jsm/loaders/RGBELoader';
import {
  PMREMGenerator,
  REVISION,
  sRGBEncoding,
  WebGLRenderer,
  PLATFORM,
  Scene,
  PlaneGeometry,
  MeshBasicMaterial,
  Mesh,
  TextureLoader,
  OrthographicCamera,
} from 'three-platformize';
import { BrowserPlatform } from 'three-platformize/src/BrowserPlatform';
import { toEnvMap } from 'three-platformize/tools/toEnvMap';
import { PNG } from 'pngjs/browser';

PLATFORM.set(new BrowserPlatform());

console.log('THREE.JS REVISION', REVISION);

const githubIcon = (
  <svg
    height="29"
    viewBox="0 0 16 16"
    version="1.1"
    width="32"
    aria-hidden="true"
    class="octicon octicon-mark-github icon-github"
  >
    <path
      fill-rule="evenodd"
      d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0 0 16 8c0-4.42-3.58-8-8-8z"
    />
  </svg>
);

export default function App() {
  const depsRef = useRef({});
  const inputRef = useRef();
  const canvas2DRef = useRef();
  const glExportRef = useRef();
  const convertPromiseRef = useRef();

  const [sizeTable, setSizeTable] = useState([]);

  useEffect(() => {
    const deps = depsRef.current;
    const { width, height } = glExportRef.current.getBoundingClientRect();
    deps.renderer = new WebGLRenderer({
      canvas: glExportRef.current,
      alpha: true,
      antialias: true,
    });
    deps.pmremGenerator = new PMREMGenerator(deps.renderer);
    deps.rgbeLoader = new RGBELoader();
    deps.textureLoader = new TextureLoader();
    deps.ctx = canvas2DRef.current.getContext('2d');
    deps.scene = new Scene();
    deps.camera = new OrthographicCamera();

    deps.camera.position.z = 1;
    deps.renderer.setSize(width, height, false);
    deps.renderer.setPixelRatio(devicePixelRatio);
    deps.renderer.outputEncoding = sRGBEncoding;
  }, []);

  async function convert(file) {
    const { renderer, rgbeLoader, pmremGenerator } = depsRef.current;
    // const canvas = canvas2DRef.current;
    // const ctx = depsRef.current.ctx

    const base64 = await blobToBase64(file);
    const hdr = await new Promise(r => rgbeLoader.load(base64, r));
    const target = pmremGenerator.fromEquirectangular(hdr);
    const buffer = new Uint8Array(target.width * target.height * 4);
    renderer.readRenderTargetPixels(
      target,
      0,
      0,
      target.width,
      target.height,
      buffer,
    );
    flip(buffer, target.width, target.height, 4);

    return new Promise(resolve => {
      const png = new PNG({
        width: target.width,
        height: target.height,
        filterType: 0,
      });
      png.data = buffer;
      const pngBuffer = PNG.sync.write(png);
      const blob = new Blob([pngBuffer.buffer], { type: 'image/png' });
      const pngFile = new File([blob], file.name.replace(/\.hdr$/i, '.png'));
      resolve({
        name: file.name.replace(/\.hdr$/i, '.png'),
        blob,
        file: pngFile,
        target,
      });

      // const imgData = new ImageData(
      //   new Uint8ClampedArray(buffer),
      //   target.width,
      //   target.height,
      // );

      // canvas.width = target.width;
      // canvas.height = target.height;
      // ctx.putImageData(imgData, 0, 0);
      // canvas.toBlob(
      //   blob =>
      //     resolve({
      //       name: file.name.replace(/\.hdr$/i, '.png'),
      //       blob,
      //       file,
      //       target,
      //     }),
      //   'image/png',
      //   0.1,
      // );
    });
  }

  async function onExport() {
    const result = await convertPromiseRef.current;
    result.forEach(({ blob, name }) => downloadBlob(blob, name));
  }

  const onFileChange = () => {
    const deps = depsRef.current;
    const files = Array.prototype.filter.call(inputRef.current.files, i =>
      i.name.match(/\.hdr$/i),
    );

    deps.scene.clear();

    convertPromiseRef.current = new Promise(async resolve => {
      const result = [];
      const len = files.length;
      const w = 1 / len;
      const h = 2 / len;

      for (let i = 0; i < len; i++) {
        const res = await convert(files[i]);
        const geometry = new PlaneGeometry(w, h, 1, 1);
        const materialOrigin = new MeshBasicMaterial({
          map: res.target.texture,
        });
        const meshOrigin = new Mesh(geometry, materialOrigin);
        meshOrigin.position.x = -(2 - w - i * w * 2) / 2;
        deps.scene.add(meshOrigin);
        deps.renderer.render(deps.scene, deps.camera);
        result.push(res);

        blobToBase64(res.blob).then(base64 => {
          deps.textureLoader.load(base64, texture => {
            const materialExported = new MeshBasicMaterial({
              map: toEnvMap(texture),
            });
            const meshExported = new Mesh(geometry, materialExported);
            meshExported.position.x = (2 - w - (len - i - 1) * w * 2) / 2;
            deps.scene.add(meshExported);
            deps.renderer.render(deps.scene, deps.camera);
          });
        });
      }

      resolve(result);
      setSizeTable(
        result.map(({ blob, file }) => ({
          name: file.name,
          original: file.size,
          exported: blob.size,
        })),
      );
    });
  };

  return (
    <div className="page">
      <div className="head">
        <a
          className="title"
          href="https://github.com/deepkolos/hdr-prefilter-texture"
        >
          {githubIcon}HDRPrefilterTexture
          <span className="version">r{REVISION}</span>
        </a>
        <div className="desc">
          导出PMREMGenerator生成的纹理，优化加载路径避免小程序部分机型BUG
        </div>
      </div>

      <div className="form">
        <input
          ref={inputRef}
          className="input-file"
          multiple
          type="file"
          onInput={onFileChange}
        />
        <button className="btn" onClick={onExport}>
          导出
        </button>
      </div>

      <div className="diff-head">
        <div>Original</div>
        <div>Exported</div>
      </div>
      <div className="diff-can">
        <svg viewBox="0 0 2 1" style="width: 100%;" />
        <div className="diff">
          <canvas className="canvas-hdr" ref={glExportRef} />
        </div>
      </div>

      <div className="size-table">
        <div className="size-table-item" />
        <div className="size-table-row">
          <div>文件名</div>
          <div>HDR</div>
          <div>PNG</div>
          <div>Saved</div>
        </div>
        {sizeTable.map(({ name, original, exported }) => (
          <div className="size-table-row">
            <div>{name}</div>
            <div>{(original / 1024).toFixed(3)}kb</div>
            <div>{(exported / 1024).toFixed(3)}kb</div>
            <div>{((original - exported) / 1024).toFixed(3)}kb</div>
          </div>
        ))}
      </div>

      <div style="flex: auto;" />
      <div className="foot">Make By DeepKolos</div>

      <canvas className="canvas-save" ref={canvas2DRef} />
    </div>
  );
}
