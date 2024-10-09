import { useMutation } from '@tanstack/react-query'

export function useCreateOrder() {
  return useMutation({
    mutationFn: async () => {},
  })
}
