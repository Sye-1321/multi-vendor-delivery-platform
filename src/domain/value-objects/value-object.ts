interface IValueObjectProps {
  [index: string]: any;
}

export abstract class ValueObjects<T extends IValueObjectProps> {
  protected readonly props: T;

  constructor(props: T) {
    if (!props) {
      throw new Error('Props cannot be undefined');
    }
    this.props = Object.freeze(props);
  }
}
