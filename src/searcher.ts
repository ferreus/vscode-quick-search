'use strict';
import * as cp from 'child_process';
import * as os from 'os';
import * as readline from 'readline';
import * as vscode from 'vscode';
import { Item } from './treeitem/Item';
import { Input, SearchRequest } from './input';


export class SearchResult {
	constructor(public filePath: string, public lineColumn: string, public searchedLine: string, public uri: vscode.Uri) {}
}
export class Searcher {
    static readonly workspaceRoot: string = vscode.workspace.rootPath || '';
    private static _agProcess: cp.ChildProcess | null;

    private static get statusBarItem(): vscode.StatusBarItem {
        const statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, 10);
        statusBarItem.command = 'quickSearcher.cancelSearch';
        statusBarItem.text = '$(x) Cancel Search $(sync~spin)';
        return statusBarItem;
    }

    static async search(input: Input): Promise<Item[]> {
		if (input.word === '') {
			return [];
		}
        this.cancel();
        const output = await this._search(input);
        return this._convertIntoItem(input, output);
    }

    static search2(searchRequest: SearchRequest, cb: (id: string, item: SearchResult) => void) {
        console.log('search2:',searchRequest.searchWord);
        if (searchRequest.searchWord === '') {
            return;
        }
        this.cancel();
        const command = 'ag';
        const args = ["-o", "--nogroup", "--column"];
        this.ignorePatterns.forEach((pattern) => {
            args.push("--ignore");
            args.push(pattern);
        });
        args.push(searchRequest.searchWord);
        if (searchRequest.folder !== '') {
            args.push(searchRequest.folder);
        }
        console.log('args:',args);
        const options = { cwd: this.workspaceRoot };
        const statusBarItem = this.statusBarItem;
        statusBarItem.show();
        this._agProcess = cp.spawn(command,args,options);
        readline.createInterface({
            input: this._agProcess.stdout,
            terminal: false
        }).on("line", (line: string) => {
            const matched: string[] = this._fileRegex().exec(line) || [];
            let [filePath, lineColumn, searchedLine = ''] = matched.slice(1);
            const resourceUri = vscode.Uri.file(`${this.workspaceRoot}/${filePath}`);
            let item = new SearchResult(filePath, lineColumn, searchedLine, resourceUri);
            console.log(filePath,lineColumn,searchedLine);
            cb(searchRequest.id, item);
        });
        this._agProcess.on("exit", (code: number, signal: string) => {
            statusBarItem.dispose();
            if (code !== 0) {
                vscode.window.showInformationMessage('Search failed');
            }
        });
    }


    static cancel(): void {
        if (this._agProcess) {
            this._agProcess.kill();
            this._agProcess = null;
        }
    }

	static readonly fileCollapsibleState: number = vscode.workspace.getConfiguration().get('quickSearcher.searchItem.expanded')
		? vscode.TreeItemCollapsibleState.Expanded
		: vscode.TreeItemCollapsibleState.Collapsed;


    static get ignorePatterns() : string[]  {
        return vscode.workspace.getConfiguration().get("quickSearcher.ignorePatterns") || [];
    }

	private static _fileRegex(): RegExp {
		return new RegExp("(.*):(\\d+:\\d+):(.*)", "g");
	}

    private static _search(input: Input): Promise<string> {
        const command = 'ag';
        const args = ["-o", "--nogroup", "--column"];
        this.ignorePatterns.forEach((pattern) => {
            args.push("--ignore");
            args.push(pattern);
        });
        args.push(input.word);
        if (input.folder !== '') {
            args.push(input.folder);
        }
        const options = { cwd: this.workspaceRoot };
        return new Promise<string>((resolve) => {
            const statusBarItem = this.statusBarItem;
            statusBarItem.show();
            this._agProcess = cp.execFile(command, args, options, (error: Error | null, stdout: string, stdderr: string) => {
                statusBarItem.dispose();
                this._agProcess = null;
                if (error) {
                    vscode.window.showInformationMessage('Search failed');
                    resolve('');
                } else {
                    resolve(stdout);
                }
            });
        });
    }

    private static _convertIntoItem(input: Input, output: string): Item[] {
        const lines = output.split(os.EOL).filter((l) => { return l !== ''; });
        const items: { [s: string]: Item } = lines.reduce((acc: { [s: string]: Item }, line) => {
            const matched: string[] = this._fileRegex().exec(line) || [];
            let [filePath, lineColumn, searchedLine = ''] = matched.slice(1);
            const resourceUri = vscode.Uri.file(`${this.workspaceRoot}/${filePath}`);
            let item = <Item>acc[resourceUri.fsPath];
            if (!item) {
                item = acc[resourceUri.fsPath] = new Item("file", undefined, this.fileCollapsibleState, resourceUri, resourceUri.fsPath, input.word);
            }
            item.pushLine(lineColumn, searchedLine);
            return acc;
        }, {});
        return Object.keys(items).map((k) => items[k]);
    }
}