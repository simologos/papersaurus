# Contributing

If you want to contribute to the Papersaurus repo, please use a Pull Request. This is the fastest way to evaluate your code and to merge it into the code base.

## Working with Code

The process of submitting a pull request is fairly straightforward and generally follows the same pattern each time:

1. [Create a new feature branch](#step-1-create-a-new-feature-branch)
2. [Make your changes](#step-2-make-your-changes)
3. [Rebase onto master](#step-3-rebase-onto-master)
4. [Run the tests](#step-4-run-the-tests)
5. [Double check your submission](#step-5-double-check-your-submission)
6. [Push your changes](#step-6-push-your-changes)
7. [Submit the pull request](#step-7-submit-the-pull-request)
8. [Review and Merging](#step-8-review-and-merging)

Details about each step are found below.

### Step 1: Create a new feature branch
The first step to submit a pull request is to create a new feature branch from master. Give the branch a meaningful name that describes what it is you're fixing/improving, such as:

```
$ git checkout -b feature/Write_a_contributing_guide
```
Note: We do not care whether you use underscores (_) or dashes in your branch name.

How you create the branch is entirely up to you.

BUT: You should do all of your development for the issue in the feature branch you created.

AND: 
- Do not combine fixes for multiple issues into one branch. Use a separate branch for each issue you're working on.
- Please check [the Trunk Based Development Guide](https://trunkbaseddevelopment.com/short-lived-feature-branches/): *"One key rule is the length of life of the branch before it gets merged and deleted. Simply put, the branch should only last a couple of days. Any longer than two days, and there is a risk of the branch becoming a long-lived feature branch (the antithesis of trunk-based development)."*

Of course when we see a missing test which is not related to our issue or we apply small refactoring, we don't open a separate pull request just for this. We want us to take care of the code base without adding more overhead than needed.

### Step 2: Make your changes
Make the changes to the code and tests, following the [code conventions](#code-conventions) as you go. Once you have finished, commit the changes to your branch:

```
$ git add .
$ git commit
```
Make sure you add a meaningful commit message that summarizes your change(s). For example: *Add a missing test to start-server.js*

- use the imperative, present tense: "change" not "changed" nor "changes"
- Capitalize the first letter
- no dot (.) at the end

### Step 3: Rebase onto master
Before you submit the pull request, be sure to rebase it onto master. This ensures your code is running on the latest available code.

Step 1:

```
$ git fetch origin
```

Step 2:

```
$ git rebase origin/master
```

Step 3: 

If there are any conflicts, fix them.

```
$ git add .
```

Step 4: 
```
$ git rebase --continue
```

Very IMPORTANT:
- Since we rebase feature branches onto master we agreed on having a git history which is easier to understand and reason about, but does not necessarily reflect the original time a commit landed on Github.

- When multiple team members are working on a feature branch you **always have to ```git pull --rebase <remote name> <branch name>```** or use the pull (rebase) option of VS Code. This way you don't put yourself into trouble if your colleague rebases the feature branch. Rebases of a feature branch can happen any time.

### Step 4: Run the tests
After rebasing, be sure to run all of the tests once again to make sure nothing broke:
```
yarn lint
yarn jest
```
If there are any failing tests, update your code until all tests pass.

### Step 5: Double check your submission
With your code ready to go, this is a good time to double-check your submission to make sure it follows our conventions. Here are the things to check:
- The commit message(s) are properly formatted.
- The change introduces no functional regression. Be sure to run ```yarn lint``` and ```yarn jest``` to verify your changes before submitting a pull request.
- Make separate pull requests for unrelated changes.
- All changes must be accompanied by tests, even if the feature you're working on previously had no tests.
- All user-facing changes must be accompanied by appropriate documentation.
- Follow the [Code Conventions](#code-conventions).

### Step 6: Push your changes
Next, push your changes to your feature branch.

```
$ git push --force
```

### Step 7: Submit the pull request
Now you're ready to submit the pull request.

- The pull request must have a description. Please try to adhere to this format:
```
Description of the pull request from a high level perspective or what it "does".

**Why**
Shortly describe why you've done this. 

**How**
Even though the "how" is clearly "described" by your code, 
it can help others when you describe key take-aways or 
outline things that are not obvious at a first glance.
You might even elaborate on why you picked a certain approach/solution.
```

### Step 8: Review and Merging

After all reviewers approved the PR, it's time to merge.

In order to keep the history clean and prevent the master from being in a broken state, use the classic merge strategy (no fast-forward):
```
--no-ff
```

IMPORTANT: 

- Your merge commit message must follow the [Conventional Commits](https://www.conventionalcommits.org/en/v1.0.0/) specification. What you enter here will be visible for customers in the changelog, so ensure that your description is meaningful to users of Papersaurus.

A merge commit message will have the following format:

```
<type>(<scope>): <subject>
<BLANK LINE>
<body>
<BLANK LINE>
<footer>
```

#### \<type>

The type MUST be one of the following:
- **build**: Changes that affect the build system or external depend­encies (example scopes: gulp, broccoli, npm)
- **chore**: Other changes that don't modify src or test files
- **ci**: Changes to our CI config­uration files and scripts
- **docs**: Docume­ntation only changes
- **feat**: A new feature
- **fix**: A bug fix
- **perf**: A code change that improves perfor­mance
- **refactor**: A code change that neither fixes a bug nor adds a feature
- **revert**: Reverts a previous commit
- **style**: Changes that do not affect the meaning of the code (white­-space, format­ting, missing semi-c­olons, etc)
- **test**: Adding missing tests or correcting existing tests

#### \<scope>:

Since this is a very small package, you don't have to provide a scope.

#### \<subject>

The subject contains a succinct description of the change:

- use the imperative, present tense: "change" not "changed" nor "changes"
- Capitalize the first letter
- no dot (.) at the end
- should not exceed 5 to 7 words

#### \<body>
Just as in the subject, use the imperative, present tense: "change" not "changed" nor "changes". The body should include the motivation for the change and contrast this with previous behavior.

> If your change is a feature / improvement, please write the body to be promoting. We want the users to make use of your new feature.

#### \<footer>
The footer should contain any information about Breaking Changes.

Breaking Changes should start with the word **BREAKING CHANGE** with a space. The rest of the commit message is then used for this.

What you enter after the "BREAKING CHANGE:" will be used in the summary of breaking changes in the changelog (inside the new version).

```
<type>(<scope>): <subject>
<BLANK LINE>
<body>
<BLANK LINE>
BREAKING CHANGE Short summary of what causes the Breaking Change
```

## Code Conventions
To ensure consistency throughout the source code, keep these rules in mind as you are working:

- All features or bug fixes must be tested by one or more specs (unit-tests).
