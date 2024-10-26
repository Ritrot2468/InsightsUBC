import { Mfield, Sfield } from "./Room";

export default class Building {
	protected fullname: string;
	protected shortname: string;
	protected address: string;
	protected href: string;
	protected _mfields: Mfield;
	protected _sfields: Sfield;

	constructor(params: Required<Record<"fullname" | "shortname" | "address" | "href", string>>) {
		this.fullname = params.fullname;
		this.shortname = params.shortname;
		this.address = params.address;
		this.href = params.href;

		// Initialize Mfield and Sfield with default values
		this._mfields = { lat: 0, lon: 0, seats: 0 };
		this._sfields = {
			fullname: this.fullname,
			shortname: this.shortname,
			number: "",
			name: "",
			address: this.address,
			type: "",
			furniture: "",
			href: this.href,
		};
	}

	public getFullname(): string {
		return this.fullname;
	}

	public getShortname(): string {
		return this.shortname;
	}

	public getAddress(): string {
		return this.address;
	}

	public getHref(): string {
		return this.href;
	}

	public static fromJSON(json: any): Building {
		const { fullname, shortname, address, href } = json;
		return new Building({ fullname, shortname, address, href });
	}
}
