import fs from "fs";
import path from "path";
import kleur from "kleur";

export interface PrismifyConfig {
  schemaFolderPath: string;
  outputFilePath: string;
  watchMode: boolean;
}

export class Prismify {
  private config: PrismifyConfig;
  private previousSchemaContent: string;

  public constructor(config: PrismifyConfig) {
    this.config = config;
    this.previousSchemaContent = "";
  }

  private formatElapsedTime(startTime: number, endTime: number): string {
    const elapsedTime = endTime - startTime;
    return `${elapsedTime} ms`;
  }

  private searchForSchemaFiles(dir: string): string[] {
    const schemaFiles: string[] = [];
    const files = fs.readdirSync(dir);

    files.forEach((file) => {
      const filePath = path.join(dir, file);
      const isDirectory = fs.lstatSync(filePath).isDirectory();

      if (isDirectory) {
        schemaFiles.push(...this.searchForSchemaFiles(filePath));
      } else if (file.endsWith(".prisma")) {
        schemaFiles.push(filePath);
      }
    });

    return schemaFiles;
  }

  private generateUnifiedSchema(): string {
    const schemaFiles = this.searchForSchemaFiles(this.config.schemaFolderPath);

    const baseSchemaPath = path.join(
      this.config.schemaFolderPath,
      "Base.prisma".toLowerCase(),
    );
    if (!fs.existsSync(baseSchemaPath)) {
      console.error(kleur.red("❌ Required file 'Base.prisma' not found."));
      process.exit(1);
    }

    const baseSchema = fs.readFileSync(baseSchemaPath, "utf-8");
    const schemaContents = schemaFiles
      .map((filePath) => {
        const content = fs.readFileSync(filePath, "utf-8");
        return filePath === baseSchemaPath ? "" : content;
      })
      .join("\n");

    const warningComment = "// WARNING: This file is generated by Prismify. Do not edit this file.";
    const generatedSchema = `${warningComment}\n\n${baseSchema}\n\n${schemaContents}`;

    return generatedSchema;
  }

  private logSchemaGeneration(outputFilePath: string, elapsedTime: string): void {
    console.log(
      kleur.green().bold("✨ Unified schema file generated:") +
        ` ${kleur.yellow(outputFilePath)} ${kleur.dim("(" + elapsedTime + ")")}`
    );
  }

  private generateAndSaveSchema = () => {
    const startTime = new Date().getTime();
    const generatedSchema = this.generateUnifiedSchema();

    if (generatedSchema !== this.previousSchemaContent) {
      fs.writeFileSync(this.config.outputFilePath, generatedSchema, "utf-8");
      this.previousSchemaContent = generatedSchema;

      const endTime = new Date().getTime();
      const elapsedTime = this.formatElapsedTime(startTime, endTime);

      this.logSchemaGeneration(this.config.outputFilePath, elapsedTime);
    }
  };

  public run(): void {
    this.generateAndSaveSchema();

    if (this.config.watchMode) {
      console.log(
        kleur.yellow().bold("👀 Watching for changes in:") +
          ` ${kleur.cyan(this.config.schemaFolderPath)}`
      );

      fs.watch(this.config.schemaFolderPath, { recursive: true }, this.generateAndSaveSchema);
    }
  }
}
