const MiniCssExtractPlugin = require("mini-css-extract-plugin");
const path = require("path");
const webpack = require("webpack");

module.exports = () => {
    return {
        entry: "./src/js/main.js",
        mode: process.env.NODE_ENV,
        output: {
            path: path.resolve(__dirname, "dist"),
            filename: "bundle.js"
        },
        module: {
            rules: [
                {
                    test: /(qr-scanner-worker.min.js|index.html)$/i,
                    loader: "file-loader",
                    options: {
                        name: "[name].[ext]",
                    },
                },
                {
                    test: /\.css$/i,
                    use: [MiniCssExtractPlugin.loader, "css-loader"],
                },
            ]
        },
        plugins: [
            new webpack.DefinePlugin({
                "ENVIRONMENT": JSON.stringify(process.env.NODE_ENV),
                "WS_HOST": JSON.stringify(process.env.WS_HOST)
            }),
            new MiniCssExtractPlugin()
        ]
    };
};