const MiniCssExtractPlugin = require("mini-css-extract-plugin");
const path = require("path");
const webpack = require("webpack");

module.exports = env => {
    return {
        entry: "./src/js/main.js",
        mode: env,
        output: {
            path: path.resolve(__dirname, "dist"),
            filename: "bundle.js"
        },
        module: {
            rules: [
                {
                    test: /qr-scanner-worker.min.js$/i,
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
                "ENVIRONMENT": JSON.stringify(env),
            }),
            new MiniCssExtractPlugin()
        ]
    };
};