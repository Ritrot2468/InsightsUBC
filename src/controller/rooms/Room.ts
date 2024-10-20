export interface Sfield {
	fullname: string;
	shortname: string;
	number: string;
	name: string;
	address: string;
}

export interface Mfield {
	lat: number;
	lon: number;
	seats: number;
	type: number;
	furniture: number;
	href: number;
}

export default class Room {
	private id: string;

	public getMfields(): Mfield {
		return this._mfields;
	}

	public setMfields(value: Mfield): void {
		this._mfields = value;
	}

	public setMfield(index: number, newVal: number): void {
		const keys: (keyof Mfield)[] = ["lat", "lon", "seats", "type", "furniture", "href"];
		if (index < 0 || index > keys.length) {
			throw new Error("Out of bounds");
		}
		this._mfields[keys[index]] = newVal;
	}

	public setSField(index: number, newVal: string): void {
		const keys: (keyof Sfield)[] = ["fullname", "shortname", "number", "name", "address"];
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
		const keys: (keyof Mfield)[] = ["lat", "lon", "seats", "type", "furniture", "href"];
		if (index < 0 || index > keys.length) {
			throw new Error("Out of bounds");
		}
		return this._mfields[keys[index]];
	}

	public getSFieldByIndex(index: number): string {
		const keys: (keyof Sfield)[] = ["fullname", "shortname", "number", "name", "address"];
		if (index < 0 || index > keys.length) {
			throw new Error("Out of bounds");
		}
		return this._sfields[keys[index]];
	}

	public getSFieldIndex(sfield: string): number {
		const keys: (keyof Sfield)[] = ["fullname", "shortname", "number", "name", "address"];
		return keys.indexOf(sfield as keyof Sfield);
		// -1 if index is not found
	}

	public getMFieldIndex(mfield: string): number {
		const keys: (keyof Mfield)[] = ["lat", "lon", "seats", "type", "furniture", "href"];
		return keys.indexOf(mfield as keyof Mfield);
		// -1 if index is not found
	}

	public getID(): string {
		return this.id;
	}

	private _mfields: Mfield;
	private _sfields: Sfield;

	private convertToJSON(): {setID: string; sFields: Sfield; mFields: Mfield} {
		return {
			setID: this.getID(),
			sFields: {
				fullname: this._sfields.fullname,
				shortname: this._sfields.shortname,
				number: this._sfields.number,
				name: this._sfields.name,
				address: this._sfields.address,
			},
			mFields: {
				lat: this._mfields.lat,
				lon: this._mfields.lon,
				seats: this._mfields.seats,
				type: this._mfields.type,
				furniture: this._mfields.furniture,
				href: this._mfields.href,
			},
		};
	}

	constructor(id: string, mfields: Mfield, sfields: Sfield) {
		this.id = id;
		this._mfields = mfields;
		this._sfields = sfields;
	}
}
