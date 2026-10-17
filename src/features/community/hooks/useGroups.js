import { useExploreGroups } from "../../groups/useExploreGroups";
import { useMyGroups } from "../../groups/useMyGroups";
import { useGroupOverview } from "../../groups/useGroupOverview";
import { useGroupActions } from "../../groups/useGroupActions";

export function useGroups(userId, options = {}) {
  const explore = useExploreGroups(options);
  const my = useMyGroups(userId);
  const overview = useGroupOverview(options.selectedGroupId);
  const actions = useGroupActions();

  return {
    exploreGroups: explore.groups,
    exploreLoading: explore.loading,
    exploreError: explore.error,
    refetchExplore: explore.refetch,

    myGroups: my.myGroups,
    myGroupsLoading: my.loading,
    refetchMyGroups: my.refetch,

    groupOverview: overview.overview,
    overviewLoading: overview.loading,
    refetchOverview: overview.refetch,

    groupActions: actions,
  };
}
