import { existsSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import type { PlopTypes } from "@turbo/gen";

/**
 * Walk up for the root turbo.json rather than trusting the shell's cwd, so
 * `pnpm new` lands in apps/ whether it is run from the root or inside a tool.
 */
function repoRoot(): string {
  let dir = process.cwd();
  while (!existsSync(join(dir, "turbo.json"))) {
    const parent = dirname(dir);
    if (parent === dir) return process.cwd();
    dir = parent;
  }
  return resolve(dir);
}

/**
 * `pnpm new` — the only supported way to add a tool.
 *
 * One answer (`name`) fixes three things at once: the directory, the package
 * name, and the Vercel project. Nothing downstream has to translate between
 * them, which is why the generator can fill in metadata without asking twice.
 *
 * Every prompt is unconditional on purpose. node-plop refuses to bypass a
 * prompt that carries a `when` function, and the bypassed path is the one an
 * agent uses:
 *
 *   pnpm new -- --args grid "Design Grid" "Preview a layout grid over a screenshot."
 */
export default function generator(plop: PlopTypes.NodePlopAPI): void {
  plop.setGenerator("tool", {
    description: "A browser-only design tool under apps/",
    prompts: [
      {
        type: "input",
        name: "name",
        message: "Name — becomes apps/<name>, the package, and the Vercel project",
        validate: (value: string) =>
          /^[a-z][a-z0-9]*(-[a-z0-9]+)*$/.test(value) ||
          "Lowercase letters, digits, single hyphens.",
      },
      {
        type: "input",
        name: "title",
        message: 'Display title, e.g. "Design Grid"',
        validate: (value: string) =>
          value.trim().length > 0 || "Required.",
      },
      {
        type: "input",
        name: "description",
        message:
          "One sentence. Used verbatim in the meta description and the OG card.",
        validate: (value: string) =>
          value.trim().length > 0 || "Required.",
      },
    ],
    actions: [
      {
        type: "addMany",
        destination: join(repoRoot(), "apps", "{{ kebabCase name }}"),
        base: "templates/tool",
        templateFiles: "templates/tool/**",
        // Required by the type, and tinyglobby skips dotfiles without it.
        globOptions: { dot: true },
        // `.hbs` is only stripped when the name already has an inner
        // extension, which is why every template file is <name>.<ext>.hbs.
        stripExtensions: ["hbs"],
      },
      (answers) => {
        const { name } = answers as { name: string };
        return [
          "",
          `apps/${name} is runnable now:`,
          "  pnpm install",
          `  pnpm --filter ${name} dev`,
          "",
          "Still yours to do:",
          "  1. components/tool.tsx — it ships a labelled placeholder",
          "  2. app/opengraph-image.tsx — make the card show what the tool does",
          `  3. Create the Vercel project "${name}" with root directory apps/${name}`,
        ].join("\n");
      },
    ],
  });
}
