const path = require('path');
const CopyPlugin = require('copy-webpack-plugin');
const MiniCssExtractPlugin = require('mini-css-extract-plugin');

module.exports = (env, argv) => {
  const isProduction = argv.mode === 'production';

  return {
    mode: isProduction ? 'production' : 'development',
    devtool: isProduction ? false : 'inline-source-map',

    entry: {
      background: './src/background/service-worker.ts',
      popup: './src/popup/index.tsx',
      options: './src/options/index.tsx',
      'content-script': './src/content/content-script.ts'
    },

    output: {
      path: path.resolve(__dirname, 'dist'),
      filename: '[name].js',
      clean: true
    },

    module: {
      rules: [
        {
          test: /\.tsx?$/,
          use: 'ts-loader',
          exclude: /node_modules/
        },
        {
          test: /\.css$/,
          use: [
            MiniCssExtractPlugin.loader,
            'css-loader',
            {
              loader: 'postcss-loader',
              options: {
                postcssOptions: {
                  plugins: [
                    require('tailwindcss'),
                    require('autoprefixer')
                  ]
                }
              }
            }
          ]
        }
      ]
    },

    resolve: {
      extensions: ['.tsx', '.ts', '.js']
    },

    plugins: [
      new MiniCssExtractPlugin({
        filename: '[name].css'
      }),
      new CopyPlugin({
        patterns: [
          {
            from: 'public',
            to: '.'
          },
          {
            from: 'src/popup/popup.html',
            to: 'popup/popup.html'
          },
          {
            from: 'src/options/options.html',
            to: 'options/options.html'
          },
          {
            from: 'src/manifest/manifest.json',
            to: 'manifest.json',
            transform(content) {
              // Generate manifest from template
              const manifest = JSON.parse(content.toString());
              return JSON.stringify(manifest, null, 2);
            }
          }
        ]
      })
    ],

    optimization: {
      minimize: isProduction
    }
  };
};
