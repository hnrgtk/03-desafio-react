import { createContext, ReactNode, useContext, useState } from "react";
import { toast } from "react-toastify";
import { api } from "../services/api";
import { Product } from "../types";

interface CartProviderProps {
  children: ReactNode;
}

interface UpdateProductAmount {
  productId: number;
  amount: number;
}

interface CartContextData {
  cart: Product[];
  addProduct: (productId: number) => Promise<void>;
  removeProduct: (productId: number) => void;
  updateProductAmount: ({ productId, amount }: UpdateProductAmount) => void;
}

const CartContext = createContext<CartContextData>({} as CartContextData);

const LOCAL_STORAGE_KEY = "@RocketShoes:cart";

export function CartProvider({ children }: CartProviderProps): JSX.Element {
  const [cart, setCart] = useState<Product[]>(() => {
    const storagedCart = localStorage.getItem(LOCAL_STORAGE_KEY);

    if (storagedCart) {
      return JSON.parse(storagedCart);
    }

    return [];
  });

  const addProduct = async (productId: number) => {
    try {
      const { data } = await api.get(`stock/${productId}`);
      const stock = data.amount;

      const cartCopy = [...cart];

      const productExistsInCart = cartCopy.find(
        (product) => product.id === productId
      );
      const currentAmount = productExistsInCart
        ? productExistsInCart.amount + 1
        : 1;

      if (currentAmount > stock) {
        toast.error("Quantidade solicitada fora de estoque");
        return;
      }

      if (productExistsInCart) {
        productExistsInCart.amount = currentAmount;
      } else {
        const { data } = await api.get(`products/${productId}`);
        cartCopy.push({
          ...data,
          amount: 1,
        });
      }

      setCart(cartCopy);
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(cartCopy));
    } catch {
      toast.error("Erro na adição do produto");
    }
  };

  const removeProduct = (productId: number) => {
    try {
      const cartCopy = [...cart];
      const productIndex = cartCopy.findIndex(
        (product) => product.id === productId
      );

      if (productIndex >= 0) {
        cartCopy.splice(productIndex, 1);
        setCart(cartCopy);
        localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(cartCopy));
      } else {
        toast.error("Erro na remoção do produto");
      }
    } catch {
      toast.error("Erro na remoção do produto");
    }
  };

  const updateProductAmount = async ({
    productId,
    amount,
  }: UpdateProductAmount) => {
    try {
      if (amount <= 0) return;

      const { data } = await api.get(`stock/${productId}`);
      const stock = data.amount;

      if (amount > stock) {
        toast.error("Quantidade solicitada fora de estoque");
        return;
      }

      const cartCopy = [...cart];
      const productExistsInCart = cartCopy.find(
        (product) => product.id === productId
      );

      if (productExistsInCart) {
        productExistsInCart.amount = amount;
        setCart(cartCopy);
        localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(cartCopy));
      } else {
        throw Error();
      }
    } catch {
      toast.error("Erro na alteração de quantidade do produto");
    }
  };

  return (
    <CartContext.Provider
      value={{ cart, addProduct, removeProduct, updateProductAmount }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart(): CartContextData {
  const context = useContext(CartContext);

  return context;
}
