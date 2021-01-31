export default (config, env) => {
  env.isProd && (config.output.publicPath = '/hdr-prefilter-texture/');
};
