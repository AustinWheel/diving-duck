import { Flex, Spinner } from "@once-ui-system/core";

export default function DashboardLoading() {
  return (
    <Flex fillWidth fillHeight center style={{ minHeight: "60vh" }}>
      <Spinner size="l" />
    </Flex>
  );
}
