import fs from 'fs';
import path from 'path';

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
    this.previousSchemaContent = '';
  }

  private formatElapsedTime(startTime: number, endTime: number): string {
    const elapsedTime = endTime - startTime;
    return `${elapsedTime} ms`;
  }

  private searchForSchemaFiles = (dir: string, schemaFiles: string[]): void => {
    const files = fs.readdirSync(dir);

    files.forEach((file) => {
      const filePath = path.join(dir, file);
      const isDirectory = fs.lstatSync(filePath).isDirectory();

      if (isDirectory) {
        this.searchForSchemaFiles(filePath, schemaFiles);
      } else if (file.endsWith('.prisma')) {
        schemaFiles.push(filePath);
      }
    });
  };

  private mergeSchemas(): void {
    const schemaFiles: string[] = [];
    const startTime = new Date().getTime();

    this.searchForSchemaFiles(this.config.schemaFolderPath, schemaFiles);

    const schemaContents = schemaFiles
      .map((filePath) => fs.readFileSync(filePath, 'utf-8'))
      .join('\n');

    const generatedSchema =
      `// Generated by Prismify - Do not edit this file\n\n${schemaContents}`;

    if (generatedSchema !== this.previousSchemaContent) {
      fs.writeFileSync(this.config.outputFilePath, generatedSchema, 'utf-8');
      this.previousSchemaContent = generatedSchema;

      const endTime = new Date().getTime();
      const elapsedTime = this.formatElapsedTime(startTime, endTime);

      console.log(
        `Unified schema file '${this.config.outputFilePath}' generated in ${elapsedTime}`
      );
    } else {
      return;
    }
  }

  public run(): void {
    this.mergeSchemas();

    if (this.config.watchMode) {
      console.log(`Watching for changes in '${this.config.schemaFolderPath}'.`);

      fs.watch(this.config.schemaFolderPath, { recursive: true }, () => {
        this.mergeSchemas();
      });
    }
  }
}
