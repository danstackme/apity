#!/usr/bin/env tsx
import { execSync } from "child_process";
import { readFileSync } from "fs";
import { resolve } from "path";
import { createInterface } from "readline";

const rl = createInterface({
  input: process.stdin,
  output: process.stdout,
});

type ReleaseType = "patch" | "minor" | "major";

const question = (query: string): Promise<string> =>
  new Promise((resolve) => rl.question(query, resolve));

const runCommand = (command: string): string => {
  try {
    return execSync(command, { encoding: "utf-8" });
  } catch (error) {
    console.error(`Error executing command: ${command}`);
    throw error;
  }
};

const getCurrentVersion = (): string => {
  const packageJson = JSON.parse(
    readFileSync(resolve(process.cwd(), "package.json"), "utf-8")
  );
  return packageJson.version;
};

const getCommitsSinceLastTag = (): string[] => {
  const lastTag = runCommand("git describe --tags --abbrev=0").trim();
  const commits = runCommand(
    `git log ${lastTag}..HEAD --pretty=format:%s`
  ).split("\n");
  return commits.filter(Boolean); // Remove empty strings
};

const generateChangelog = (commits: string[]): string => {
  const categories = {
    feat: "Features",
    fix: "Bug Fixes",
    docs: "Documentation",
    style: "Styling",
    refactor: "Code Refactoring",
    perf: "Performance Improvements",
    test: "Tests",
    build: "Build System",
    ci: "CI",
    chore: "Chores",
    revert: "Reverts",
  } as const;

  const categorizedCommits = commits.reduce((acc, commit) => {
    const match = commit.match(/^(\w+)(?:\(.*?\))?:\s*(.+)/);
    if (match) {
      const [, type, message] = match;
      const category = type as keyof typeof categories;
      if (category in categories) {
        const title = categories[category];
        acc[title] = acc[title] || [];
        acc[title].push(message.trim());
      } else {
        acc.Other = acc.Other || [];
        acc.Other.push(commit);
      }
    } else {
      acc.Other = acc.Other || [];
      acc.Other.push(commit);
    }
    return acc;
  }, {} as Record<string, string[]>);

  let changelog = "";
  for (const [category, messages] of Object.entries(categorizedCommits)) {
    if (messages.length > 0) {
      changelog += `\n### ${category}\n\n`;
      messages.forEach((message) => {
        changelog += `- ${message}\n`;
      });
    }
  }

  return changelog;
};

const updateVersion = async (): Promise<ReleaseType> => {
  console.log("\nCurrent version:", getCurrentVersion());
  console.log("\nSelect release type:");
  console.log("1. patch (bug fixes)");
  console.log("2. minor (new features)");
  console.log("3. major (breaking changes)");

  const choice = await question("\nEnter your choice (1-3): ");
  const types: ReleaseType[] = ["patch", "minor", "major"];
  const selectedType = types[parseInt(choice) - 1];

  if (!selectedType) {
    throw new Error("Invalid release type selected");
  }

  return selectedType;
};

const createGitHubRelease = async (
  version: string,
  changelog: string
): Promise<void> => {
  const releaseNotes = changelog.replace(/"/g, '\\"').replace(/`/g, "\\`");
  const command = `gh release create v${version} --title "v${version}" --notes "${releaseNotes}"`;

  try {
    runCommand(command);
    console.log(`\n✅ Created GitHub release v${version}`);
  } catch (error) {
    console.error(
      "\n❌ Failed to create GitHub release. Please create it manually:"
    );
    console.log(`Version: v${version}`);
    console.log("Changelog:");
    console.log(changelog);
  }
};

const main = async () => {
  try {
    // Ensure working directory is clean
    const status = runCommand("git status --porcelain");
    if (status.trim()) {
      throw new Error(
        "Working directory is not clean. Please commit or stash changes."
      );
    }

    // Pull latest changes
    console.log("📥 Pulling latest changes...");
    runCommand("git pull --rebase");

    // Get release type and update version
    const releaseType = await updateVersion();
    const oldVersion = getCurrentVersion();
    runCommand(`npm version ${releaseType} --no-git-tag-version`);
    const newVersion = getCurrentVersion();

    // Generate changelog
    console.log("\n📝 Generating changelog...");
    const commits = getCommitsSinceLastTag();
    const changelog = generateChangelog(commits);

    // Show summary and confirm
    console.log("\n📋 Release Summary:");
    console.log(`Version: ${oldVersion} → ${newVersion}`);
    console.log("\nChangelog:");
    console.log(changelog);

    const confirm = await question("\nProceed with release? (y/N): ");
    if (confirm.toLowerCase() !== "y") {
      // Revert version change
      runCommand(`git checkout package.json`);
      throw new Error("Release cancelled");
    }

    // Commit version change
    console.log("\n📦 Committing version change...");
    runCommand("git add package.json package-lock.json");
    runCommand(`git commit -m "chore: release ${newVersion}"`);

    // Create and push tag
    console.log("\n🏷️  Creating and pushing tag...");
    runCommand(`git tag -a v${newVersion} -m "Release ${newVersion}"`);
    runCommand("git push && git push --tags");

    // Create GitHub release
    console.log("\n🚀 Creating GitHub release...");
    await createGitHubRelease(newVersion, changelog);

    console.log("\n✨ Release process completed successfully!");
  } catch (error) {
    console.error(
      "\n❌ Error:",
      error instanceof Error ? error.message : error
    );
    process.exit(1);
  } finally {
    rl.close();
  }
};

main();
