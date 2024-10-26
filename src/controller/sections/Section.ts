export interface Sfield {
	uuid: string;
	id: string;
	title: string;
	instructor: string;
	dept: string;
}

export interface Mfield {
	year: number;
	avg: number;
	pass: number;
	fail: number;
	audit: number;
}

export default class Section {
	private id: string;

	public getMfields(): Mfield {
		return this._mfields;
	}

	public setMfields(value: Mfield): void {
		this._mfields = value;
	}

	public setMfield(index: number, newVal: number): void {
		const keys: (keyof Mfield)[] = ["year", "avg", "pass", "fail", "audit"];
		if (index < 0 || index > keys.length) {
			throw new Error("Out of bounds");
		}
		this._mfields[keys[index]] = newVal;
	}

	public setSField(index: number, newVal: string): void {
		const keys: (keyof Sfield)[] = ["uuid", "id", "title", "instructor", "dept"];
		if (index < 0 || index > keys.length) {
			throw new Error("Out of bounds");
		}
		this._sfields[keys[index]] = newVal;
	}

	public getSfields(): Sfield {
		return this._sfields;
	}

	public setSfields(value: Sfield): void {
		this._sfields = value;
	}

	public getMFieldByIndex(index: number): number {
		const keys: (keyof Mfield)[] = ["year", "avg", "pass", "fail", "audit"];
		if (index < 0 || index > keys.length) {
			throw new Error("Out of bounds");
		}
		return this._mfields[keys[index]];
	}

	public getSFieldByIndex(index: number): string {
		const keys: (keyof Sfield)[] = ["uuid", "id", "title", "instructor", "dept"];
		if (index < 0 || index > keys.length) {
			throw new Error("Out of bounds");
		}
		return this._sfields[keys[index]];
	}

	public getSFieldIndex(sfield: string): number {
		const keys: (keyof Sfield)[] = ["uuid", "id", "title", "instructor", "dept"];
		return keys.indexOf(sfield as keyof Sfield);
		// -1 if index is not found
	}

	public getMFieldIndex(mfield: string): number {
		const keys: (keyof Mfield)[] = ["year", "avg", "pass", "fail", "audit"];
		return keys.indexOf(mfield as keyof Mfield);
		// -1 if index is not found
	}

	public getID(): string {
		return this.id;
	}

	private _mfields: Mfield;
	private _sfields: Sfield;

	private convertToJSON(): { setID: string; sFields: Sfield; mFields: Mfield } {
		return {
			setID: this.getID(),
			sFields: {
				uuid: this._sfields.uuid,
				id: this._sfields.id,
				title: this._sfields.title,
				instructor: this._sfields.instructor,
				dept: this._sfields.dept,
			},
			mFields: {
				year: this._mfields.year,
				avg: this._mfields.avg,
				pass: this._mfields.pass,
				fail: this._mfields.fail,
				audit: this._mfields.audit,
			},
		};
	}

	constructor(id: string, mfields: Mfield, sfields: Sfield) {
		this.id = id;
		this._mfields = mfields;
		this._sfields = sfields;
	}
}
