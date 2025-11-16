import fetch from "node-fetch";

interface ErrorMessage {
  message?: string;
}

interface Owner {
  avatar_url: string;
}

export interface Repository {
  name: string;
  description: string;
  stargazers_count: number;
  owner: Owner;
}

export interface IResponse extends ErrorMessage {
  repos: Repository[];
  stars: number;
}

// https://gist.github.com/yyx990803/7745157
export default async function stars(username: string): Promise<IResponse> {
  const repos: Repository[] = [];
  let page = 1;

  // eslint-disable-next-line no-constant-condition
  while (true) {
    const response = await fetch(`https://api.github.com/users/${username}/repos?per_page=100&page=${page}`);
    const json = await response.json();

    if ((json as ErrorMessage).message !== undefined) {
      return { stars: 0, repos: [], message: (json as ErrorMessage).message };
    }

    const newRepos = json as Repository[];
    if (newRepos.length === 0) {
      break;
    } else {
      repos.push(...newRepos);
      page++;
    }
  }

  const stars = repos.reduce((prev: number, curr: Repository) => prev + curr.stargazers_count, 0);
  repos.sort((a: Repository, b: Repository) => b.stargazers_count - a.stargazers_count);

  return { stars, repos };
}
