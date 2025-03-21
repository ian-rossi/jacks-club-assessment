export abstract class UseCase<I, O> {
    abstract execute(input: I): Promise<O>;
}
