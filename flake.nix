# SPDX-License-Identifier: Unlicense
{
  inputs = {
    nixpkgs.url = "github:NixOS/nixpkgs/nixpkgs-unstable";
  };

  outputs =
    {
      self,
      nixpkgs,
      flake-utils,
    }:
    flake-utils.lib.eachSystem nixpkgs.lib.systems.flakeExposed (
      system:
      let
        pkgs = import nixpkgs { inherit system; config.allowUnfree=true; };
      in
      {
        devShells.default = pkgs.mkShell {
          buildInputs = with pkgs; [
            bun
            mongodb-ce mongodb-cli
          ];
        };
      }
    );
}
