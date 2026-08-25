import * as latex from './latex.js';
import * as plot3d from './plot3d.js';
import * as imagine from './imagine.js';

export const commands = [latex, plot3d, imagine];

// name -> command module, for interaction dispatch.
export const commandMap = new Map(commands.map((command) => [command.data.name, command]));
