import { Fragment } from "react/jsx-runtime";
import { parseAddressList } from "~/lib/address";

export function AddressLabel({ value }: { value: string }) {
  const addresses = parseAddressList(value);

  return (
    <>
      {addresses.map((a, i) => {
        const hasName = a.name !== "" && a.name !== a.address;
        return (
          <Fragment key={`${a.address}-${i}`}>
            {i > 0 ? ", " : null}
            {hasName ? (
              <>
                {a.name} <small className="address-email">&lt;{a.address}&gt;</small>
              </>
            ) : (
              a.address
            )}
          </Fragment>
        );
      })}
    </>
  );
}
