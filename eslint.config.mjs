import nextPlugin from "eslint-config-next";

const eslintConfig = [
  ...nextPlugin,
  {
    rules: {
      "react-hooks/set-state-in-effect": "off",
    },
    linterOptions: {
      reportUnusedDisableDirectives: "off",
    },
  },
];

export default eslintConfig;

