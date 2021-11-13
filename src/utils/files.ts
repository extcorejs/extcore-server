import * as path from 'path';
import * as fs from 'fs';

interface FileFromPath {
  fileName: string;
  relativeDir: string;
  absoluteDir: string;
}

export const readDirRecursively = (directory: string): FileFromPath[] => {
  const files: FileFromPath[] = [];

  const getFilesFromDir = (rootDirectory: string, subDirectory = './') => {
    const currentPath = path.join(rootDirectory, subDirectory);

    fs.readdirSync(currentPath).forEach((file) => {
      const isDirectory = fs.lstatSync(path.join(currentPath, file)).isDirectory();

      if (isDirectory) {
        getFilesFromDir(rootDirectory, `${subDirectory}${file}/`);
      } else {
        files.push({
          fileName: file,
          relativeDir: subDirectory,
          absoluteDir: currentPath,
        });
      }
    });
  };

  getFilesFromDir(directory);

  return files;
};
