const { defineConfig } = require('@vue/cli-service')
const HtmlWebpackPlugin = require('html-webpack-plugin')
const HtmlWebpackInlineSourcePlugin = require('html-webpack-inline-source-plugin')
module.exports = defineConfig({
  publicPath: '/',
  css: {
    extract: false,
  },
  configureWebpack: {
    output: {
      publicPath: '/',
    },
    optimization: {
      splitChunks: false,
    },
    plugins: [
      new HtmlWebpackPlugin({
        publicPath: '/',
        inject: "body",
        filename: 'UniVapeKras.html', // the output file name that will be created
        template: 'src/output-template.html', // this is important - a template file to use for insertion
        inlineSource: '.(js|css)$' // embed all javascript and css inline
      }),
      new HtmlWebpackInlineSourcePlugin(HtmlWebpackPlugin)
    ]
  }
})
