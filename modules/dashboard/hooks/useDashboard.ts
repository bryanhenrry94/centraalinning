const data = {
  stats: {
    users: 100,

    activeUsers: 80,

    newUsers: 20,
  },
  modules: [
    {
      id: 1,

      name: "Module 1",
    },
  ],
  documents: [
    {
      id: 1,

      title: "Document 1",
    },
  ],
  status: "active",
};

export function useDashboard() {
  // const {data}=useQuery(...)

  return {
    stats: data.stats,

    modules: data.modules,

    documents: data.documents,

    status: data.status,
  };
}
