export default class Building {
	protected fullname: string;
	protected shortname: string;
	protected address: string;
	protected href: string;

	constructor(params: Required<Record<"fullname" | "shortname" | "address" | "href", string>>) {
		this.fullname = params.fullname;
		this.shortname = params.shortname;
		this.address = params.address;
		this.href = params.href;
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
}
