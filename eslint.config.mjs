import nextConfig from "eslint-config-next"

const eslintConfig = [
    ...nextConfig,
    {
        ignores: ["server/", "shared/"],
    },
]

export default eslintConfig
