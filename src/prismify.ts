import fs from "fs";
import path from "path";

export class Prismify {
  private schemaFolderPath: string;
  private outputFilePath: string;
  private watchMode: boolean;
  private previousSchemaContent: string;

  public constructor(
    schemaFolderPath: string,
    outputFilePath: string,
    watchMode: boolean
  ) {
    this.schemaFolderPath = schemaFolderPath;
    this.outputFilePath = outputFilePath;
    this.watchMode = watchMode;
    this.previousSchemaContent = "";
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
      } else if (file.endsWith(".prisma")) {
        schemaFiles.push(filePath);
      }
    });
  };

  private mergeSchemas(): void {
    const schemaFiles: string[] = [];
    const startTime = new Date().getTime();

    this.searchForSchemaFiles(this.schemaFolderPath, schemaFiles);

    const schemaContents = schemaFiles
      .map((filePath) => fs.readFileSync(filePath, "utf-8"))
      .join("\n");

    if (schemaContents !== this.previousSchemaContent) {
      fs.writeFileSync(this.outputFilePath, schemaContents, "utf-8");
      this.previousSchemaContent = schemaContents;

      const endTime = new Date().getTime();
      const elapsedTime = this.formatElapsedTime(startTime, endTime);

      console.log(
        `Unified schema file '${this.outputFilePath}' generated in ${elapsedTime}`
      );
    } else {
      return;
    }
  }

  public run(): void {
    this.mergeSchemas();

    if (this.watchMode) {
      console.log(`Watching for changes in '${this.schemaFolderPath}'.`);

      fs.watch(this.schemaFolderPath, { recursive: true }, () => {
        this.mergeSchemas();
      });
    }
  }
}
