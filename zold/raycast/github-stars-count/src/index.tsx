import { useState, useCallback } from "react";
import { List, Icon, Color, ImageMask } from "@raycast/api";
import debounce from "lodash.debounce"
import useSWRInfinite from "swr"
import stars, { IResponse, Repository } from "./utils/stars";


const fetcher = (url: string) => fetch(url).then(r => r.json())
const getKey = (pageIndex: number, previousPageData: Repository[]) => {
  if (previousPageData && !previousPageData.length) return null 
  return `/users?page=${pageIndex}&limit=10`                  
}

export default function Command() {
  // const { data, size, setSize } = useSWRInfinite(getKey, fetcher)
  const [isLoading, setIsLoading] = useState(false);
  const [response, setResponse] = useState<IResponse | null>(null);

  const debouncedSearch = useCallback(
    debounce((newValue: string) => {
      if (!isLoading) {
        fetchStars(newValue);
      }
    }, 450),
    []
  )

  async function fetchStars(username: string) {
    setIsLoading(true);
    const res = await stars(username);
    setIsLoading(false);
    setResponse(res);
  }

  return (
    <List searchBarPlaceholder="Search username" onSearchTextChange={(text) => debouncedSearch(text)} isLoading={isLoading} >
      {response &&
        (response.message ? (
          <List.Item title={response.message} icon={{ source: Icon.ExclamationMark, tintColor: Color.Red }} />
        ) : (
          <>
            <List.Item title={`${response.stars} total stars`} icon={{ source: Icon.Star, tintColor: Color.Yellow }} />
            {response.repos.map(({ name, description, stargazers_count, owner }) => (
              <List.Item
                key={name}
                title={name}
                subtitle={description}
                accessoryTitle={`${stargazers_count}  ★`}
                icon={{
                  source: owner.avatar_url,
                  mask: ImageMask.Circle,
                }}
              />
            ))}
          </>
        ))}
    </List>
  );
}
