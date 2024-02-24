import { ComponentType } from "react";
import { Route, useParams } from "react-router-dom";

type SplitOr<S extends string, D extends string> =
  S extends '' ? [] :
  S extends `${infer T}${D}${infer U}` ? T | SplitOr<U, D> : S;

type StripMandatoryPrefix<S extends string, P extends string> =
  S extends `${P}${infer U}` ? U : never;

type ParamNames<Path extends string> = StripMandatoryPrefix<SplitOr<Path, "/">, ":">;

function InjectParams<
  ParamNames extends string,
>(
  props: { Component: ComponentType<Record<ParamNames, string>> },
) {
  const { Component } = props;
  const params = useParams() as unknown as Record<ParamNames, string>;
  return <Component {...params} />;
};

export function autoRoute<Path extends string>(
  path: Path,
  Component: ComponentType<Record<ParamNames<Path>, string>>,
) {
  return <Route
    path={path}
    element={<InjectParams<ParamNames<Path>> Component={Component} />}
  />;
}
