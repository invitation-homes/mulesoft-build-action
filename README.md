# Mulesoft Build Action

A GitHub Action that uses maven to compile a jar from a Mulesoft project, creates a release on GitHub, and uploads the jar to that release.

## Usage
Add the following steps in your workflow:

```
    - uses: invitation-homes/mulesoft-build-action@main
        env:
          GITHUB_TOKEN:  ${{secrets.GITHUB_TOKEN}}
          MULESOFT_NEXUS_USER: ${{ secrets.MULESOFT_NEXUS_USER  }}
          MULESOFT_NEXUS_PASSWORD: ${{ secrets.MULESOFT_NEXUS_PASSWORD }}
          SECRET_KEY: ${{ secrets.MULESOFT_SECRET_KEY_LOCAL }}

```


## License

This code is made available under the MIT license.